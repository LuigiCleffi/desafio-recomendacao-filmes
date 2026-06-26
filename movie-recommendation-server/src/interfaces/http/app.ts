import Fastify from 'fastify'
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import sensible from '@fastify/sensible'
import type { GetMoviesUseCase } from '../../application/use-cases/GetMoviesUseCase.js'
import type { GetMovieByIdUseCase } from '../../application/use-cases/GetMovieByIdUseCase.js'
import type { CreateMovieUseCase } from '../../application/use-cases/CreateMovieUseCase.js'
import type { GetMovieRecommendationsUseCase } from '../../application/use-cases/GetMovieRecommendationsUseCase.js'
import { createMovieRoutes } from './routes/movies.js'

export interface AppDeps {
  getMovies: GetMoviesUseCase
  getMovieById: GetMovieByIdUseCase
  createMovie: CreateMovieUseCase
  getRecommendations: GetMovieRecommendationsUseCase
}

export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>()

  app.register(sensible)

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(createMovieRoutes(deps), { prefix: '/movies' })

  return app
}
