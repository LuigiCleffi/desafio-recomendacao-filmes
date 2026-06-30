import type { Movie, CreateMovieInput, Genre } from '../entities/Movie.js'

export interface MovieRepository {
  findAll(): Promise<Movie[]>
  findById(id: string): Promise<Movie | null>
  findByGenre(genre: Genre, opts?: { limit?: number; offset?: number }): Promise<Movie[]>
  countByGenre(genre: Genre): Promise<number>
  findSimilar(embedding: number[], limit: number, excludeId?: string): Promise<Movie[]>
  create(input: CreateMovieInput): Promise<Movie>
  updateEmbedding(id: string, embedding: number[]): Promise<void>
}
