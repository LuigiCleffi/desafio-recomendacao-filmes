import type { User, PaginatedResponse } from '../types'
import { api } from './api'

export async function getUsers(page = 1, limit = 20): Promise<PaginatedResponse<User>> {
  const { data } = await api.get<PaginatedResponse<User>>('/users', {
    params: { page, limit },
  })
  return data
}

export async function createUser(birthYear: number): Promise<User> {
  const { data } = await api.post<User>('/users', { birthYear })
  return data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`)
  return data
}
