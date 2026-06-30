import type { Movie, PaginatedResponse } from '../types'
import { api } from './api'

export async function getMoviesByGenre(
  genre: string,
  limit = 10,
): Promise<PaginatedResponse<Movie>> {
  const { data } = await api.get<PaginatedResponse<Movie>>('/movies', {
    params: { genre, limit },
  })
  return data
}
