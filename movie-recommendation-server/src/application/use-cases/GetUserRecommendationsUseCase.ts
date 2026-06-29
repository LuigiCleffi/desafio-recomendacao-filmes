import type { Movie } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'
import type { UserRepository } from '../../domain/repositories/UserRepository.js'
import type { RecommendationModel } from '../../domain/services/Recommendation.js'

export class GetUserRecommendationsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly movieRepository: MovieRepository,
    private readonly recommendationModel: RecommendationModel,
  ) {}

  async execute(userId: string, limit = 10): Promise<Movie[]> {
    const user = await this.userRepository.findById(userId)
    if (!user) return []

    const movieIds = await this.recommendationModel.recommend(userId, limit)

    const movies = await Promise.all(
      movieIds.map(id => this.movieRepository.findById(id)),
    )

    return movies.filter((m): m is Movie => m !== null)
  }
}
