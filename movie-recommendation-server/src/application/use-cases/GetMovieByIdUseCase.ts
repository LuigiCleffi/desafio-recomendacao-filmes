import type { Movie } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'

export class GetMovieByIdUseCase {
  constructor(private readonly movieRepository: MovieRepository) {}

  execute(id: string): Promise<Movie | null> {
    return this.movieRepository.findById(id)
  }
}
