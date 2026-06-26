import { Type, type Static } from '@sinclair/typebox'
import type { FastifyPluginAsync } from 'fastify'
import type { GetMoviesUseCase } from '../../../application/use-cases/GetMoviesUseCase.js'
import type { GetMovieByIdUseCase } from '../../../application/use-cases/GetMovieByIdUseCase.js'
import type { CreateMovieUseCase } from '../../../application/use-cases/CreateMovieUseCase.js'
import type { GetMovieRecommendationsUseCase } from '../../../application/use-cases/GetMovieRecommendationsUseCase.js'
import type { Movie } from '../../../domain/entities/Movie.js'

interface Deps {
  getMovies: GetMoviesUseCase
  getMovieById: GetMovieByIdUseCase
  createMovie: CreateMovieUseCase
  getRecommendations: GetMovieRecommendationsUseCase
}

const MovieSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  releaseYear: Type.Union([Type.Integer(), Type.Null()]),
  genre: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
})

const CreateMovieBody = Type.Object({
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  releaseYear: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
  genre: Type.Optional(Type.Union([Type.String(), Type.Null()])),
})

const IdParam = Type.Object({ id: Type.String() })

type IdParamType = Static<typeof IdParam>
type CreateMovieBodyType = Static<typeof CreateMovieBody>

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
    fastify.get('/', {
      schema: { response: { 200: Type.Array(MovieSchema) } },
    }, async () => {
      const result = await deps.getMovies.execute()
      return result.map(serialize)
    })

    fastify.get<{ Params: IdParamType }>('/:id', {
      schema: {
        params: IdParam,
        response: { 200: MovieSchema },
      },
    }, async (request, reply) => {
      const movie = await deps.getMovieById.execute(request.params.id)
      if (!movie) return reply.notFound('Movie not found')
      return serialize(movie)
    })

    fastify.post<{ Body: CreateMovieBodyType }>('/', {
      schema: {
        body: CreateMovieBody,
        response: { 201: MovieSchema },
      },
    }, async (request, reply) => {
      const movie = await deps.createMovie.execute(request.body)
      reply.code(201)
      return serialize(movie)
    })

    fastify.get<{ Params: IdParamType }>('/:id/recommendations', {
      schema: {
        params: IdParam,
        response: { 200: Type.Array(MovieSchema) },
      },
    }, async (request) => {
      const result = await deps.getRecommendations.execute(request.params.id)
      return result.map(serialize)
    })
  }
}
