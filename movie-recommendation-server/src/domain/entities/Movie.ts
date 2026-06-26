export interface Movie {
  id: string
  title: string
  description: string | null
  releaseYear: number | null
  genre: string | null
  embedding: number[] | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateMovieInput {
  title: string
  description?: string | null
  releaseYear?: number | null
  genre?: string | null
}
