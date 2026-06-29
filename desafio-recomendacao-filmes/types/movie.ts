export interface Movie {
  id: string
  title: string
  description: string | null
  releaseYear: number | null
  genres: string[]
  createdAt: string
  updatedAt: string
}

export interface MovieDetails extends Movie {
  posterUrl?: string
  backdropUrl?: string
}
