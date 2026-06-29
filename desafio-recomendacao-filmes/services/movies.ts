import type { Movie } from '../types'
import { api } from './api'

export async function getMovies(): Promise<Movie[]> {
  const { data } = await api.get<Movie[]>('/movies')
  return data
}

export async function getMovieById(id: string): Promise<Movie> {
  const { data } = await api.get<Movie>(`/movies/${id}`)
  return data
}
