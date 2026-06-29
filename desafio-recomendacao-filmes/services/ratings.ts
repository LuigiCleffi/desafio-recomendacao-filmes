import { api } from './api'

export interface Rating {
  id: string
  userId: string
  movieId: string
  rating: number
  createdAt: string
}

export async function getUserRatings(userId: string): Promise<Rating[]> {
  const { data } = await api.get<Rating[]>(`/users/${userId}/ratings`)
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
