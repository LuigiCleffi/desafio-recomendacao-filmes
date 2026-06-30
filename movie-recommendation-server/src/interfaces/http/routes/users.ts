import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import type { UserRepository } from '../../../domain/repositories/UserRepository.js'

const UserResponseSchema = z.object({
  id: z.string(),
  externalId: z.number(),
  birthYear: z.number(),
  createdAt: z.string(),
})

const PaginatedUsersResponseSchema = z.object({
  data: z.array(UserResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

function serialize(user: { id: string; externalId: number; birthYear: number; createdAt: Date }) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  }
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function createUserRoutes(userRepository: UserRepository): FastifyPluginAsync {
  return async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.get('/', {
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
        }),
        response: { 200: PaginatedUsersResponseSchema },
      },
    }, async (request) => {
      const { page, limit } = request.query
      const offset = (page - 1) * limit

      const [data, total] = await Promise.all([
        userRepository.findAll({ limit, offset }),
        userRepository.count(),
      ])

      return {
        data: data.map(serialize),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    })

    app.get('/:id', {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: UserResponseSchema },
      },
    }, async (request, reply) => {
      const user = await userRepository.findById(request.params.id)
      if (!user) return reply.notFound()
      return serialize(user)
    })

    app.post('/', {
      schema: {
        body: z.object({ birthYear: z.number().int().min(1900).max(new Date().getFullYear()) }),
        response: { 201: UserResponseSchema },
      },
    }, async (request, reply) => {
      const externalId = Math.floor(Math.random() * 2_000_000_000) + 100_000
      const user = await userRepository.create({ externalId, birthYear: request.body.birthYear })
      return reply.code(201).send(serialize(user))
    })
  }
}
