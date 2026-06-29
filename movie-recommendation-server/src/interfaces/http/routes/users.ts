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

function serialize(user: { id: string; externalId: number; birthYear: number; createdAt: Date }) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  }
}

export function createUserRoutes(userRepository: UserRepository): FastifyPluginAsync {
  return async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.get('/', {
      schema: {
        response: { 200: z.array(UserResponseSchema) },
      },
    }, async () => {
      const result = await userRepository.findAll()
      return result.map(serialize)
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
      // Seeded MovieLens IDs are 1-8000; pick a random int well above that range
      // but within PostgreSQL integer max (2,147,483,647).
      const externalId = Math.floor(Math.random() * 2_000_000_000) + 100_000
      const user = await userRepository.create({ externalId, birthYear: request.body.birthYear })
      return reply.code(201).send(serialize(user))
    })
  }
}
