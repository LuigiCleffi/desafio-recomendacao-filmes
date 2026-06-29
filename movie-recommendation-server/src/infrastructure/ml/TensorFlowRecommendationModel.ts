import * as tf from '@tensorflow/tfjs-node'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { RecommendationModel } from '../../domain/services/Recommendation.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'
import type { RatingRepository } from '../../domain/repositories/RatingRepository.js'

class GlobalCtx {
  constructor(
    readonly movieVectors: { movieId: string; meta: object; vector: number[] }[],
    readonly inputDim: number,
  ) {}
}

export class TensorflowRecommendationModel implements RecommendationModel {
  private _model: tf.LayersModel | null = null
  private _globalCtx: GlobalCtx | null = null

  constructor(
    private readonly modelPath: string,
    private readonly movieRepository: MovieRepository,
    private readonly ratingRepository: RatingRepository,
  ) {}

  async load(): Promise<void> {
    const modelDir = resolve(process.cwd(), this.modelPath)

    if (!existsSync(resolve(modelDir, 'model.json'))) {
      throw new Error(`No saved model found at ${modelDir}. Run training first.`)
    }

    this._model = await tf.loadLayersModel(`file://${modelDir}/model.json`)

    // Pre-compute movie vectors (like context.productVectors in browser worker)
    const allMovies = await this.movieRepository.findAll()
    const movieVectors = allMovies
      .filter(m => m.embedding)
      .map(m => ({
        movieId: m.id,
        meta: { ...m },
        vector: m.embedding!,
      }))

    this._globalCtx = new GlobalCtx(movieVectors, 44)
  }

  isReady(): boolean {
    return this._model !== null && this._globalCtx !== null
  }

  private async computeUserVector(userId: string): Promise<Float32Array> {
    if (!this._globalCtx) return new Float32Array(22)

    const ratings = await this.ratingRepository.findByUserId(userId)
    if (ratings.length === 0) return new Float32Array(22)

    const ratedIds = new Set(ratings.map(r => r.movieId))
    const ratedVectors = this._globalCtx.movieVectors
      .filter(mv => ratedIds.has(mv.movieId))
      .map(mv => mv.vector)

    if (ratedVectors.length === 0) return new Float32Array(22)

    // Mean of rated movie embeddings — same logic as encodeUser() in userEmbedding.ts
    const dim = ratedVectors[0]!.length
    const mean = new Float32Array(dim)
    for (const vec of ratedVectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] = (mean[i] ?? 0) + (vec[i] ?? 0) / ratedVectors.length
      }
    }
    return mean
  }

  async predict(userId: string, movieId: string): Promise<number> {
    if (!this._model || !this._globalCtx) return 0

    const movieVec = this._globalCtx.movieVectors.find(mv => mv.movieId === movieId)
    if (!movieVec) return 0

    const userVector = await this.computeUserVector(userId)
    const input = new Float32Array(44)
    input.set(userVector, 0)
    input.set(movieVec.vector, 22)

    const tensor = tf.tensor2d([Array.from(input)], [1, 44])
    const prediction = this._model.predict(tensor) as tf.Tensor
    const score = prediction.dataSync()[0] ?? 0
    tensor.dispose()
    prediction.dispose()
    return score
  }

  async recommend(userId: string, limit: number): Promise<string[]> {
    if (!this._model || !this._globalCtx) return []

    const context = this._globalCtx
    const userVector = await this.computeUserVector(userId)

    const inputs: number[][] = context.movieVectors.map(({ vector }) => [
      ...Array.from(userVector),
      ...vector,
    ])

    const inputTensor = tf.tensor2d(inputs)
    const predictions = this._model.predict(inputTensor) as tf.Tensor
    const scores = predictions.dataSync()

    const recommendations = context.movieVectors.map((item, index) => ({
      id: item.movieId,
      score: scores[index] ?? 0,
    }))

    recommendations.sort((a, b) => b.score - a.score)

    inputTensor.dispose()
    predictions.dispose()

    return recommendations.slice(0, limit).map(s => s.id)
  }
}
