import { useQueries } from '@tanstack/react-query'
import { getMoviesByGenre } from '../services/movies'

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi',
  'Romance', 'Thriller', 'Animation', 'Documentary', 'Fantasy',
] as const

const ITEMS_PER_GENRE = 10

export function useGenreMovies(visibleGenres: readonly string[]) {
  const queries = useQueries({
    queries: GENRES.map((genre) => ({
      queryKey: ['movies', genre, ITEMS_PER_GENRE],
      queryFn: () => getMoviesByGenre(genre, ITEMS_PER_GENRE),
      enabled: visibleGenres.includes(genre),
      staleTime: 1000 * 60 * 10,
    })),
  })

  const genreMap = new Map<string, typeof queries[number]['data']>()
  const isLoadingSome = queries.some(
    (q, i) => q.isFetching && visibleGenres.includes(GENRES[i]!),
  )
  const isLoadingFirstBatch =
    queries[0]?.isFetching && visibleGenres.length > 0

  for (let i = 0; i < GENRES.length; i++) {
    const genre = GENRES[i]!
    const data = queries[i]?.data
    if (data) genreMap.set(genre, data)
  }

  return { genreMap, isLoadingSome, isLoadingFirstBatch }
}
