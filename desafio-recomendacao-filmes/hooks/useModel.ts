import { useQuery } from '@tanstack/react-query'
import { getModelStatus } from '../services/recommendations'

export function useModelStatus() {
  return useQuery({
    queryKey: ['model-status'],
    queryFn: getModelStatus,
    refetchInterval: 5000,
  })
}
