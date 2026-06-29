import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '../services/recommendations'

export function useRecommendations(userId: string | null) {
  const id = userId ?? '__none__'

  return useQuery({
    queryKey: ['recommendations', id],
    queryFn: () => getRecommendations(id),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })
}
