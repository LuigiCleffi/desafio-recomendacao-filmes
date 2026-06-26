export interface User {
  id: string
  externalId: number
  createdAt: Date
}

export interface CreateUserInput {
  externalId: number
}
