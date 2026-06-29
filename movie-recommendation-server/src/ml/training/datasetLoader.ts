import * as tf from '@tensorflow/tfjs-node'
import type { Movie } from '../../domain/entities/Movie.js'
import type { Rating } from '../../domain/entities/Recommendation.js'
import type { User } from '../../domain/entities/User.js'
import type { MovieContext } from '../embeddings/movieEmbedding.js'
import type { UserContext } from '../embeddings/userEmbedding.js'
import { encodeUser } from '../embeddings/userEmbedding.js'

export interface TrainingContext {
  movieContext: MovieContext
  userContext: UserContext
  users: User[]
  movieVectors: { movieId: string; meta: Movie; vector: number[] }[]
  ratedByUser: Map<string, Set<string>>
  ratingsByUser: Map<string, Rating[]>
  inputDim: number
}

// 5 random negatives per positive keeps the dataset at ~100k pairs
// (vs 82M for a full cross-product at 10k movies × 8k users)
// and maintains a ~5:1 class ratio that binaryCrossentropy can learn from.
const NEGATIVE_SAMPLES_PER_POSITIVE = 5

export function createTrainingData(context: TrainingContext) {
  const inputs: number[][] = []
  const labels: number[] = []
  const movieCount = context.movieVectors.length

  context.users
    .filter(u => {
      const rated = context.ratedByUser.get(u.id)
      return rated && rated.size > 0
    })
    .forEach(user => {
      const userRatings = context.ratingsByUser.get(user.id) ?? []
      const t = encodeUser(user, userRatings, context.movieContext, context.userContext)
      const userVector = Array.from(t.dataSync())
      t.dispose()

      const userRatedSet = context.ratedByUser.get(user.id)!

      // Positive samples: every movie this user actually rated
      for (const { movieId, vector: movieVector } of context.movieVectors) {
        if (!userRatedSet.has(movieId)) continue
        inputs.push([...userVector, ...movieVector])
        labels.push(1)
      }

      // Negative samples: random unrated movies
      const targetNegatives = userRatings.length * NEGATIVE_SAMPLES_PER_POSITIVE
      let sampled = 0
      const tried = new Set<number>()
      while (sampled < targetNegatives && tried.size < movieCount) {
        const idx = Math.floor(Math.random() * movieCount)
        if (tried.has(idx)) continue
        tried.add(idx)
        const mv = context.movieVectors[idx]!
        if (!userRatedSet.has(mv.movieId)) {
          inputs.push([...userVector, ...mv.vector])
          labels.push(0)
          sampled++
        }
      }
    })

  return {
    xs: tf.tensor2d(inputs),
    ys: tf.tensor2d(labels, [labels.length, 1]),
    inputDim: context.inputDim,
  }
}
