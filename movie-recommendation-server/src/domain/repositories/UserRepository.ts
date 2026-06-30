import type { User, CreateUserInput } from '../entities/User.js'

export interface UserRepository {
  findAll(opts?: {
    birthYear?: number
    limit?: number
    offset?: number
  }): Promise<User[]>
  count(opts?: { birthYear?: number }): Promise<number>
  findById(id: string): Promise<User | null>
  findByExternalId(externalId: number): Promise<User | null>
  create(input: CreateUserInput): Promise<User>
}
