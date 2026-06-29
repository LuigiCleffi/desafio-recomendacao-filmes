export interface User {
  id: string
  externalId: number
  birthYear: number
  createdAt: Date
}

export interface CreateUserInput {
  externalId: number
  birthYear: number
}
