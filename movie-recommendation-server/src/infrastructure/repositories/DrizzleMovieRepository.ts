import { eq, isNotNull, ne, and, sql } from 'drizzle-orm'
import type { Movie, CreateMovieInput } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'
import type { Database } from '../database/drizzle/client.js'
import { movies } from '../database/drizzle/schema.js'

export class DrizzleMovieRepository implements MovieRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Movie[]> {
    return this.db.select().from(movies)
  }

  async findById(id: string): Promise<Movie | null> {
    const rows = await this.db.select().from(movies).where(eq(movies.id, id))
    return rows[0] ?? null
  }

  async findByGenre(genre: string): Promise<Movie[]> {
    return this.db.select().from(movies).where(eq(movies.genre, genre))
  }

  async findSimilar(embedding: number[], limit: number, excludeId?: string): Promise<Movie[]> {
    const vectorLiteral = `[${embedding.join(',')}]`
    const distance = sql<number>`embedding <=> ${vectorLiteral}::vector`

    const condition = excludeId
      ? and(isNotNull(movies.embedding), ne(movies.id, excludeId))
      : isNotNull(movies.embedding)

    return this.db
      .select()
      .from(movies)
      .where(condition)
      .orderBy(distance)
      .limit(limit)
  }

  async create(input: CreateMovieInput): Promise<Movie> {
    const rows = await this.db.insert(movies).values(input).returning()
    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')
    return row
  }

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const vectorLiteral = `[${embedding.join(',')}]`
    await this.db
      .update(movies)
      .set({ embedding: sql`${vectorLiteral}::vector` })
      .where(eq(movies.id, id))
  }
}
