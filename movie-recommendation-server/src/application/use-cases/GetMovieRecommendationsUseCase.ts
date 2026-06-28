import type { Movie } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'

const MAX_RECOMMENDATIONS = 10

export class GetMovieRecommendationsUseCase {
  constructor(private readonly movieRepository: MovieRepository) {}

  async execute(movieId: string): Promise<Movie[]> {
    const movie = await this.movieRepository.findById(movieId)
    if (!movie) return []

    if (movie.embedding) {
      return this.movieRepository.findSimilar(movie.embedding, MAX_RECOMMENDATIONS, movieId)
    }

    if (movie.genres.length > 0) {
      const sameGenre = await this.movieRepository.findByGenre(movie.genres[0]!)
      const others = sameGenre.filter((m) => m.id !== movieId)
      if (others.length > 0) return others.slice(0, MAX_RECOMMENDATIONS)
    }

    const all = await this.movieRepository.findAll()
    return all.filter((m) => m.id !== movieId).slice(0, MAX_RECOMMENDATIONS)
  }
}
