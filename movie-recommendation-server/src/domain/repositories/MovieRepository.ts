import type { Movie, CreateMovieInput } from '../entities/Movie.js'

export interface MovieRepository {
  findAll(): Promise<Movie[]>
  findById(id: string): Promise<Movie | null>
  findByGenre(genre: string): Promise<Movie[]>
  findSimilar(embedding: number[], limit: number, excludeId?: string): Promise<Movie[]>
  create(input: CreateMovieInput): Promise<Movie>
  updateEmbedding(id: string, embedding: number[]): Promise<void>
}
