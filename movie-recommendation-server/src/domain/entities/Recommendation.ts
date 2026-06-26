export interface Recommendation {
  id: string
  userId: string
  movieId: string
  score: number
  modelVersion: string | null
  createdAt: Date
}

export interface Rating {
  id: string
  userId: string
  movieId: string
  rating: number
  createdAt: Date
}

export interface CreateRatingInput {
  userId: string
  movieId: string
  rating: number
}
