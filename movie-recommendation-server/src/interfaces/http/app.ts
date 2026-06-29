import Fastify from 'fastify'
import cors from '@fastify/cors'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import sensible from '@fastify/sensible'
import type { GetMoviesUseCase } from '../../application/use-cases/GetMoviesUseCase.js'
import type { GetMovieByIdUseCase } from '../../application/use-cases/GetMovieByIdUseCase.js'
import type { CreateMovieUseCase } from '../../application/use-cases/CreateMovieUseCase.js'
import type { GetMovieRecommendationsUseCase } from '../../application/use-cases/GetMovieRecommendationsUseCase.js'
import type { GetUserRecommendationsUseCase } from '../../application/use-cases/GetUserRecommendationsUseCase.js'
import type { TensorflowRecommendationModel } from '../../infrastructure/ml/TensorFlowRecommendationModel.js'
import type { UserRepository } from '../../domain/repositories/UserRepository.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'
import type { RatingRepository } from '../../domain/repositories/RatingRepository.js'
import { createMovieRoutes } from './routes/movies.js'
import { createUserRoutes } from './routes/users.js'
import { createRecommendationRoutes } from './routes/recommendations.js'
import { createRatingRoutes } from './routes/ratings.js'

export interface AppDeps {
  userRepository: UserRepository
  movieRepository: MovieRepository
  ratingRepository: RatingRepository
  getMovies: GetMoviesUseCase
  getMovieById: GetMovieByIdUseCase
  createMovie: CreateMovieUseCase
  getRecommendations: GetMovieRecommendationsUseCase
  getUserRecommendations: GetUserRecommendationsUseCase
  recommendationModel: TensorflowRecommendationModel
}

export async function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: true })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: true })
  app.register(sensible)

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(createMovieRoutes(deps), { prefix: '/movies' })
  app.register(createUserRoutes(deps.userRepository), { prefix: '/users' })
  app.register(createRecommendationRoutes(deps), { prefix: '' })
  app.register(createRatingRoutes(deps.ratingRepository), { prefix: '' })

  return app
}
