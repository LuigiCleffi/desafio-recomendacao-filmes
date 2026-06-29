import type { Movie, ModelStatus } from '../types'
import { api } from './api'

export async function getRecommendations(
  userId: string,
  limit = 10,
): Promise<Movie[]> {
  const { data } = await api.get<Movie[]>(
    `/users/${userId}/recommendations?limit=${limit}`,
  )
  return data
}

export async function getModelStatus(): Promise<ModelStatus> {
  const { data } = await api.get<ModelStatus>('/model/status')
  return data
}

