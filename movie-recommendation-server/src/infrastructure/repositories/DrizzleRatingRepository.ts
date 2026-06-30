import { eq, sql } from 'drizzle-orm'
import type { Rating, CreateRatingInput } from '../../domain/entities/Recommendation.js'
import type { AverageRating, RatingRepository } from '../../domain/repositories/RatingRepository.js'
import type { Database } from '../database/drizzle/client.js'
import { ratings } from '../database/drizzle/schema.js'

export class DrizzleRatingRepository implements RatingRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Rating[]> {
    return this.db.select().from(ratings)
  }

  async findByUserId(userId: string): Promise<Rating[]> {
    return this.db.select().from(ratings).where(eq(ratings.userId, userId))
  }

  async findByMovieId(movieId: string): Promise<Rating[]> {
    return this.db.select().from(ratings).where(eq(ratings.movieId, movieId))
  }

  async findAverageRatings(): Promise<AverageRating[]> {
    return this.db
      .select({
        movieId: ratings.movieId,
        averageRating: sql<number>`ROUND(AVG(${ratings.rating})::numeric, 1)`,
      })
      .from(ratings)
      .groupBy(ratings.movieId)
  }

  async create(input: CreateRatingInput): Promise<Rating> {
    const rows = await this.db.insert(ratings).values(input).returning()
    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')
    return row
  }

  async createMany(inputs: CreateRatingInput[]): Promise<void> {
    if (inputs.length === 0) return
    await this.db.insert(ratings).values(inputs)
  }
}
