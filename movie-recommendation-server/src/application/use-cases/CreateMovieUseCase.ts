import type { Movie, CreateMovieInput } from '../../domain/entities/Movie.js'
import type { MovieRepository } from '../../domain/repositories/MovieRepository.js'

export class CreateMovieUseCase {
  constructor(private readonly movieRepository: MovieRepository) {}

  execute(input: CreateMovieInput): Promise<Movie> {
    return this.movieRepository.create(input)
  }
}
