import type { Rating, CreateRatingInput } from '../entities/Recommendation.js'

export interface RatingRepository {
  findAll(): Promise<Rating[]>
  findByUserId(userId: string): Promise<Rating[]>
  findByMovieId(movieId: string): Promise<Rating[]>
  create(input: CreateRatingInput): Promise<Rating>
  createMany(inputs: CreateRatingInput[]): Promise<void>
}
