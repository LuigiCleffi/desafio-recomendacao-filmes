import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import type { GetMoviesUseCase } from '../../../application/use-cases/GetMoviesUseCase.js'
import type { GetMovieByIdUseCase } from '../../../application/use-cases/GetMovieByIdUseCase.js'
import type { CreateMovieUseCase } from '../../../application/use-cases/CreateMovieUseCase.js'
import type { GetMovieRecommendationsUseCase } from '../../../application/use-cases/GetMovieRecommendationsUseCase.js'
import type { Movie } from '../../../domain/entities/Movie.js'
import { GenreSchema, CreateMovieInputSchema } from '../../../domain/entities/Movie.js'

interface Deps {
  getMovies: GetMoviesUseCase
  getMovieById: GetMovieByIdUseCase
  createMovie: CreateMovieUseCase
  getRecommendations: GetMovieRecommendationsUseCase
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

export function createMovieRoutes(deps: Deps): FastifyPluginAsync {
  return async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.get('/', {
      schema: { response: { 200: z.array(MovieResponseSchema) } },
    }, async () => {
      const result = await deps.getMovies.execute()
      return result.map(serialize)
    })

    app.get('/:id', {
      schema: {
        params: IdParamSchema,
        response: { 200: MovieResponseSchema },
      },
    }, async (request, reply) => {
      const movie = await deps.getMovieById.execute(request.params.id)
      if (!movie) return reply.notFound('Movie not found')
      return serialize(movie)
    })

    app.post('/', {
      schema: {
        body: CreateMovieInputSchema,
        response: { 201: MovieResponseSchema },
      },
    }, async (request, reply) => {
      const movie = await deps.createMovie.execute(request.body)
      reply.code(201)
      return serialize(movie)
    })

    app.get('/:id/recommendations', {
      schema: {
        params: IdParamSchema,
        response: { 200: z.array(MovieResponseSchema) },
      },
    }, async (request) => {
      const result = await deps.getRecommendations.execute(request.params.id)
      return result.map(serialize)
    })
  }
}
