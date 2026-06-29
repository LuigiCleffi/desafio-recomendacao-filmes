import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserRatings, createRating } from '../services/ratings'

export function useUserRatings(userId: string | null) {
  return useQuery({
    queryKey: ['ratings', userId],
    queryFn: () => getUserRatings(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60,
  })
}

export function useCreateRating(userId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ movieId, rating }: { movieId: string; rating: number }) =>
      createRating(userId!, movieId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings', userId] })
      queryClient.invalidateQueries({ queryKey: ['recommendations', userId] })
    },
  })
}
