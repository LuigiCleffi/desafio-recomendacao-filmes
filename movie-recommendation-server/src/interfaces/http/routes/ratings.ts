import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import type { RatingRepository } from '../../../domain/repositories/RatingRepository.js'

const IdParamSchema = z.object({ id: z.string().uuid() })

const RatingResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  movieId: z.string(),
  rating: z.number(),
  createdAt: z.string(),
})

function serialize(r: { id: string; userId: string; movieId: string; rating: number; createdAt: Date }) {
  return { ...r, createdAt: r.createdAt.toISOString() }
}

const AverageRatingResponseSchema = z.object({
  movieId: z.string(),
  averageRating: z.number(),
})

export function createRatingRoutes(ratingRepository: RatingRepository): FastifyPluginAsync {
  return async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.get('/ratings/averages', {
      schema: {
        response: { 200: z.array(AverageRatingResponseSchema) },
      },
    }, async () => {
      const averages = await ratingRepository.findAverageRatings()
      return averages.map(a => ({
        movieId: a.movieId,
        averageRating: Number(a.averageRating),
      }))
    })

    app.get('/users/:id/ratings', {
      schema: {
        params: IdParamSchema,
        response: { 200: z.array(RatingResponseSchema) },
      },
    }, async (request) => {
      const ratings = await ratingRepository.findByUserId(request.params.id)
      return ratings.map(serialize)
    })

    app.post('/users/:id/ratings', {
      schema: {
        params: IdParamSchema,
        body: z.object({
          movieId: z.string().uuid(),
          rating: z.number().min(0).max(5),
        }),
        response: { 201: RatingResponseSchema },
      },
    }, async (request, reply) => {
      const created = await ratingRepository.create({
        userId: request.params.id,
        movieId: request.body.movieId,
        rating: request.body.rating,
      })
      return reply.code(201).send(serialize(created))
    })
  }
}
