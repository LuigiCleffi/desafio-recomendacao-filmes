'use client'

import { useState, useMemo, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { useQueryClient } from '@tanstack/react-query'
import { User as UserIcon, Search, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUsers } from '@/hooks/useUsers'
import { UserProfileCard } from '@/components/molecules/UserProfileCard'
import { createUser } from '@/services/users'
import type { UserProfile } from '@/types'

interface UserSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser: (user: UserProfile) => void
  currentUser: UserProfile | null
}

export function UserSelectModal({
  open,
  onOpenChange,
  onSelectUser,
  currentUser,
}: UserSelectModalProps) {
  const queryClient = useQueryClient()
  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useUsers()

  const users = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  )

  const [search, setSearch] = useState('')
  const [newAge, setNewAge] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateUser = async () => {
    const age = Number(newAge)
    if (Number.isNaN(age) || age < 1 || age > 120) return

    setCreating(true)
    try {
      const birthYear = new Date().getFullYear() - age
      const newUser = await createUser(birthYear)

      queryClient.invalidateQueries({ queryKey: ['users', 'infinite'] })

      onSelectUser({ id: newUser.id, birthYear: newUser.birthYear })
      setNewAge('')
      onOpenChange(false)
    } finally {
      setCreating(false)
    }
  }

  const filtered = search
    ? users.filter(
        (u) =>
          String(u.birthYear).includes(search) ||
          u.id.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  const isInitialLoading = isFetching && !isFetchingNextPage && !users.length

  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)

  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    setScrollRoot(node)
  }, [])

  const { ref: sentinelRef } = useInView({
    root: scrollRoot,
    rootMargin: '200px',
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            Your Profile
          </DialogTitle>
          <DialogDescription>
            Create a profile with your age to get personalized
            recommendations, or select an existing MovieLens user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="age">Your Age</Label>
            <div className="flex gap-2">
              <Input
                id="age"
                type="number"
                min={1}
                max={120}
                placeholder="e.g. 25"
                value={newAge}
                onChange={(e) => setNewAge(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && handleCreateUser()
                }
              />
              <Button
                onClick={handleCreateUser}
                disabled={!newAge || creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>All Profiles</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by birth year..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div ref={scrollRef} className="max-h-60 overflow-y-auto space-y-1">
              {isInitialLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                filtered.map((u) => (
                  <UserProfileCard
                    key={u.id}
                    birthYear={u.birthYear}
                    isSelected={currentUser?.id === u.id}
                    onSelect={() => {
                      onSelectUser({
                        id: u.id,
                        birthYear: u.birthYear,
                      })
                      onOpenChange(false)
                    }}
                  />
                ))
              )}

              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {hasNextPage && !search && (
                <div ref={sentinelRef} className="h-4" />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
