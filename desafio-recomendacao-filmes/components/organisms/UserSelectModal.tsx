'use client'

import { useState, useEffect } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { useUsers } from '@/hooks/useUsers'
import { UserProfileCard } from '@/components/molecules/UserProfileCard'
import { createUser } from '@/services/users'
import type { User, UserProfile } from '@/types'

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
  const { data: serverUsers = [] } = useUsers()
  const [localUsers, setLocalUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [newAge, setNewAge] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) return

    const saved = localStorage.getItem('movieLocalUsers')
    if (saved) {
      try {
        setLocalUsers(JSON.parse(saved))
      } catch {
        /* empty */
      }
    }
  }, [open])

  const handleCreateUser = async () => {
    const age = Number(newAge)
    if (Number.isNaN(age) || age < 1 || age > 120) return

    setCreating(true)
    try {
      const birthYear = new Date().getFullYear() - age
      // Persist to DB so ratings and recommendations work correctly
      const newUser = await createUser(birthYear)

      const updated = [...localUsers, newUser]
      setLocalUsers(updated)
      localStorage.setItem('movieLocalUsers', JSON.stringify(updated))
      queryClient.invalidateQueries({ queryKey: ['users'] })

      onSelectUser({ id: newUser.id, birthYear: newUser.birthYear })
      setNewAge('')
      onOpenChange(false)
    } finally {
      setCreating(false)
    }
  }

  const allUsers = [...localUsers, ...serverUsers]
  const filtered = search
    ? allUsers.filter(
        (u) =>
          String(u.birthYear).includes(search) ||
          u.id.toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers

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

          {allUsers.length > 0 && (
            <>
              <Separator />
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
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filtered.map((u) => {
                    const isServerUser = serverUsers.some(
                      (su) => su.id === u.id,
                    )
                    return (
                      <UserProfileCard
                        key={u.id}
                        birthYear={u.birthYear}
                        isLocal={!isServerUser}
                        isSelected={currentUser?.id === u.id}
                        onSelect={() => {
                          onSelectUser({
                            id: u.id,
                            birthYear: u.birthYear,
                          })
                          onOpenChange(false)
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
