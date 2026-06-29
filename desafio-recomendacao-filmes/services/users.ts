import type { User } from '../types'
import { api } from './api'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
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
