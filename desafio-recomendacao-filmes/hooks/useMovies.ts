import { useQuery } from '@tanstack/react-query'
import { getMovies } from '../services/movies'

export function useMovies() {
  return useQuery({
    queryKey: ['movies'],
    queryFn: getMovies,
    staleTime: 1000 * 60 * 5, // 5 min
  })
}
