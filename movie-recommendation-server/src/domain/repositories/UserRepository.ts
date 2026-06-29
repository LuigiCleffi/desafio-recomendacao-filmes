import type { User, CreateUserInput } from '../entities/User.js'

export interface UserRepository {
  findAll(opts?: { birthYear?: number; limit?: number }): Promise<User[]>
  findById(id: string): Promise<User | null>
  findByExternalId(externalId: number): Promise<User | null>
  create(input: CreateUserInput): Promise<User>
}
