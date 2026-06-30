import { z } from 'zod'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import type { GetUserRecommendationsUseCase } from '../../../application/use-cases/GetUserRecommendationsUseCase.js'
import type { TensorflowRecommendationModel } from '../../../infrastructure/ml/TensorFlowRecommendationModel.js'
import type { MovieRepository } from '../../../domain/repositories/MovieRepository.js'
import type { UserRepository } from '../../../domain/repositories/UserRepository.js'
import type { RatingRepository } from '../../../domain/repositories/RatingRepository.js'
import { GenreSchema } from '../../../domain/entities/Movie.js'
import type { Movie } from '../../../domain/entities/Movie.js'
import { makeMovieContext, encodeMovie } from '../../../ml/embeddings/movieEmbedding.js'
import { makeUserContext } from '../../../ml/embeddings/userEmbedding.js'
import { createTrainingData } from '../../../ml/training/datasetLoader.js'
import { configureNeuralNetAndTrain, saveModel } from '../../../ml/models/recommendationModel.js'

interface Deps {
  getUserRecommendations: GetUserRecommendationsUseCase
  recommendationModel: TensorflowRecommendationModel
  movieRepository: MovieRepository
  userRepository: UserRepository
  ratingRepository: RatingRepository
}

const MovieResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  genres: z.array(GenreSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const IdParamSchema = z.object({ id: z.string() })

function serialize(movie: Movie) {
  const { embedding: _embedding, ...rest } = movie
  return {
    ...rest,
    createdAt: movie.createdAt.toISOString(),
    updatedAt: movie.updatedAt.toISOString(),
  }
}

export function createRecommendationRoutes(deps: Deps): FastifyPluginAsync {
  let trainingStatus: 'idle' | 'training' | 'error' = 'idle'

  return async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.get('/users/:id/recommendations', {
      schema: {
        params: IdParamSchema,
        querystring: z.object({ limit: z.coerce.number().int().min(1).max(100).default(10) }),
        response: { 200: z.array(MovieResponseSchema) },
      },
    }, async (request, reply) => {
      if (!deps.recommendationModel.isReady()) {
        return reply.notFound('Model not available. Run training first.')
      }
      const result = await deps.getUserRecommendations.execute(
        request.params.id,
        request.query.limit,
      )
      return result.map(serialize)
    })

    // SSE endpoint: streams epoch-by-epoch progress while training
    fastify.get('/model/train/stream', async (request, reply) => {
      // @fastify/cors sets headers via reply.header() which Fastify buffers internally.
      // reply.hijack() bypasses that buffer, so CORS must be set on reply.raw directly.
      const origin = request.headers.origin ?? '*'
      reply.raw.setHeader('Access-Control-Allow-Origin', origin)
      reply.raw.setHeader('Vary', 'Origin')
      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')
      reply.hijack()
      reply.raw.flushHeaders()

      if (trainingStatus === 'training') {
        reply.raw.write(`data: ${JSON.stringify({ type: 'already_training', message: 'Training already in progress on the server.' })}\n\n`)
        reply.raw.end()
        return
      }

      trainingStatus = 'training'

      let active = true
      reply.raw.on('close', () => { active = false })

      const send = (data: object) => {
        if (!active) return
        try {
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
        } catch (_) {
          active = false
        }
      }

      try {
        send({ type: 'status', message: 'Loading data from database...' })

        const [allMovies, allUsers, allRatings] = await Promise.all([
          deps.movieRepository.findAll(),
          deps.userRepository.findAll(),
          deps.ratingRepository.findAll(),
        ])

        send({
          type: 'status',
          message: `Loaded ${allMovies.length} movies, ${allUsers.length} users, ${allRatings.length} ratings`,
        })

        if (allRatings.length === 0) {
          throw new Error('No ratings found. Run `npm run db:seed` first.')
        }

        send({ type: 'status', message: 'Building feature contexts...' })
        const movieContext = makeMovieContext(allMovies, allRatings, allUsers)
        const userContext = makeUserContext(allUsers, allMovies, movieContext)

        const movieVectors = allMovies.map(m => {
          const t = encodeMovie(m, movieContext)
          const vector = Array.from(t.dataSync())
          t.dispose()
          return { movieId: m.id, meta: { ...m }, vector }
        })

        const ratedByUser = new Map<string, Set<string>>()
        const ratingsByUser = new Map<string, typeof allRatings>()
        for (const r of allRatings) {
          const set = ratedByUser.get(r.userId) ?? new Set<string>()
          set.add(r.movieId)
          ratedByUser.set(r.userId, set)
          const list = ratingsByUser.get(r.userId) ?? []
          list.push(r)
          ratingsByUser.set(r.userId, list)
        }

        const trainData = createTrainingData({
          movieContext,
          userContext,
          users: allUsers,
          movieVectors,
          ratedByUser,
          ratingsByUser,
          inputDim: userContext.dimensions + movieContext.dimensions,
        })

        send({
          type: 'status',
          message: `Training on ${trainData.xs.shape[0]} sample pairs (input dim=${trainData.inputDim})...`,
        })

        const TOTAL_EPOCHS = 100
        let lastAcc = 0

        const model = await configureNeuralNetAndTrain(trainData, (epoch, logs) => {
          lastAcc = (logs.acc as number | undefined) ?? lastAcc
          send({
            type: 'epoch',
            epoch: epoch + 1,
            totalEpochs: TOTAL_EPOCHS,
            loss: logs.loss,
            acc: (logs.acc as number | undefined) ?? null,
            valLoss: (logs.val_loss as number | undefined) ?? null,
            valAcc: (logs.val_acc as number | undefined) ?? null,
          })
        })

        const modelDir = resolve(process.cwd(), 'model')
        if (!existsSync(modelDir)) mkdirSync(modelDir, { recursive: true })

        send({ type: 'status', message: 'Saving model to disk...' })
        await saveModel(model, modelDir)

        send({ type: 'status', message: 'Persisting embeddings to database...' })
        const BATCH = 50
        for (let i = 0; i < movieVectors.length; i += BATCH) {
          const batch = movieVectors.slice(i, i + BATCH)
          await Promise.all(batch.map(mv => deps.movieRepository.updateEmbedding(mv.movieId, mv.vector)))
          send({ type: 'progress', message: `Embeddings: ${Math.min(i + BATCH, movieVectors.length)} / ${movieVectors.length}` })
        }

        send({ type: 'status', message: 'Reloading model into server...' })
        await deps.recommendationModel.load()

        trainingStatus = 'idle'
        send({ type: 'done', accuracy: lastAcc })

        trainData.xs.dispose()
        trainData.ys.dispose()
        model.dispose()
      } catch (err) {
        trainingStatus = 'error'
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
      }

      reply.raw.end()
    })

    app.get('/model/status', {
      schema: {
        response: {
          200: z.object({
            status: z.enum(['idle', 'training', 'ready', 'error']),
            modelReady: z.boolean(),
          }),
        },
      },
    }, async (): Promise<{ status: 'idle' | 'training' | 'ready' | 'error'; modelReady: boolean }> => {
      const status = deps.recommendationModel.isReady() ? 'ready' as const : trainingStatus
      return { status, modelReady: deps.recommendationModel.isReady() }
    })
  }
}
