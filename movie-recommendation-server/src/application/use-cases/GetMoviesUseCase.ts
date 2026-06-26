import type { Movie } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'

export class GetMoviesUseCase {
  constructor(private readonly movieRepository: MovieRepository) {}

  execute(): Promise<Movie[]> {
    return this.movieRepository.findAll()
  }
}
