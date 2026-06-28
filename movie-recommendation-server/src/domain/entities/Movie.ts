import { z } from 'zod'

export const GenreSchema = z.enum([
  'Action',
  'Adventure',
  'Animation',
  'Children',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Film-Noir',
  'Horror',
  'IMAX',
  'Musical',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
])

export type Genre = z.infer<typeof GenreSchema>

export const GENRE_VALUES = GenreSchema.options

export const MovieSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  genres: z.array(GenreSchema),
  embedding: z.array(z.number()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Movie = z.infer<typeof MovieSchema>

export const CreateMovieInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  releaseYear: z.number().int().nullable().optional(),
  genres: z.array(GenreSchema).optional(),
})

export type CreateMovieInput = z.infer<typeof CreateMovieInputSchema>
