import { count, eq } from 'drizzle-orm'
import type { User, CreateUserInput } from '../../domain/entities/User.js'
import type { UserRepository } from '../../domain/repositories/UserRepository.js'
import type { Database } from '../database/drizzle/client.js'
import { users } from '../database/drizzle/schema.js'

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findAll(opts?: {
    birthYear?: number
    limit?: number
    offset?: number
  }): Promise<User[]> {
    const query = this.db.select().from(users).$dynamic()

    if (opts?.limit != null) query.limit(opts.limit)
    if (opts?.offset != null) query.offset(opts.offset)

    return query
  }

  async count(opts?: { birthYear?: number }): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(users)

    const row = rows[0]
    return row?.value ?? 0
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id))
    return rows[0] ?? null
  }

  async findByExternalId(externalId: number): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.externalId, externalId))
    return rows[0] ?? null
  }

  async create(input: CreateUserInput): Promise<User> {
    const rows = await this.db.insert(users).values(input).returning()
    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')
    return row
  }
}
