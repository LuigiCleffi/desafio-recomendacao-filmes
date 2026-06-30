import { useInfiniteQuery } from '@tanstack/react-query'
import { getUsers } from '../services/users'

const PAGE_SIZE = 20

export function useUsers(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam }) => getUsers(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}
