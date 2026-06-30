import { eq, isNotNull, ne, and, count, sql } from 'drizzle-orm'
import type { Movie, CreateMovieInput, Genre } from '../../domain/entities/Movie.js'
import { GenreSchema } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'
import type { Database } from '../database/drizzle/client.js'
import { movies, type MovieRow } from '../database/drizzle/schema.js'

function parseGenres(raw: string | null): Genre[] {
  if (!raw) return []
  return raw
    .split('|')
    .map((g) => g.trim())
    .filter((g): g is Genre => GenreSchema.safeParse(g).success)
}

function toMovie(row: MovieRow): Movie {
  const { genre, ...rest } = row
  return { ...rest, genres: parseGenres(genre) }
}

export class DrizzleMovieRepository implements MovieRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Movie[]> {
    const rows = await this.db.select().from(movies)
    return rows.map(toMovie)
  }

  async findById(id: string): Promise<Movie | null> {
    const rows = await this.db.select().from(movies).where(eq(movies.id, id))
    return rows[0] ? toMovie(rows[0]) : null
  }

  async findByGenre(genre: Genre, opts?: { limit?: number; offset?: number }): Promise<Movie[]> {
    const query = this.db
      .select()
      .from(movies)
      .where(sql`${genre} = ANY(string_to_array(${movies.genre}, '|'))`)
      .$dynamic()

    if (opts?.limit != null) query.limit(opts.limit)
    if (opts?.offset != null) query.offset(opts.offset)

    return query.then((rows) => rows.map(toMovie))
  }

  async countByGenre(genre: Genre): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(movies)
      .where(sql`${genre} = ANY(string_to_array(${movies.genre}, '|'))`)

    return rows[0]?.value ?? 0
  }

  async findSimilar(embedding: number[], limit: number, excludeId?: string): Promise<Movie[]> {
    const vectorLiteral = `[${embedding.join(',')}]`
    const distance = sql<number>`embedding <=> ${vectorLiteral}::vector`

    const condition = excludeId
      ? and(isNotNull(movies.embedding), ne(movies.id, excludeId))
      : isNotNull(movies.embedding)

    const rows = await this.db
      .select()
      .from(movies)
      .where(condition)
      .orderBy(distance)
      .limit(limit)
    return rows.map(toMovie)
  }

  async create(input: CreateMovieInput): Promise<Movie> {
    const { genres, ...rest } = input
    const rows = await this.db
      .insert(movies)
      // externalId is intentionally omitted from CreateMovieInput (API-created movies);
      // the DB constraint will enforce it at runtime if needed
      .values({ ...rest, genre: genres?.join('|') ?? null } as any)
      .returning()
    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')
    return toMovie(row)
  }

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const vectorLiteral = `[${embedding.join(',')}]`
    await this.db
      .update(movies)
      .set({ embedding: sql`${vectorLiteral}::vector` })
      .where(eq(movies.id, id))
  }
}
