import type { Rating, CreateRatingInput } from '../entities/Recommendation.js'

export interface AverageRating {
  movieId: string
  averageRating: number
}

export interface RatingRepository {
  findAll(): Promise<Rating[]>
  findByUserId(userId: string): Promise<Rating[]>
  findByMovieId(movieId: string): Promise<Rating[]>
  findAverageRatings(): Promise<AverageRating[]>
  create(input: CreateRatingInput): Promise<Rating>
  createMany(inputs: CreateRatingInput[]): Promise<void>
}
