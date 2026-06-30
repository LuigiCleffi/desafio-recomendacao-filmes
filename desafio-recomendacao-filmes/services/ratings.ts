import { api } from './api'

export interface Rating {
  id: string
  userId: string
  movieId: string
  rating: number
  createdAt: string
}

export interface AverageRating {
  movieId: string
  averageRating: number
}

export async function getUserRatings(userId: string): Promise<Rating[]> {
  const { data } = await api.get<Rating[]>(`/users/${userId}/ratings`)
  return data
}

export async function getAverageRatings(): Promise<AverageRating[]> {
  const { data } = await api.get<AverageRating[]>('/ratings/averages')
  return data
}

export async function createRating(
  userId: string,
  movieId: string,
  rating: number,
): Promise<Rating> {
  const { data } = await api.post<Rating>(`/users/${userId}/ratings`, { movieId, rating })
  return data
}
