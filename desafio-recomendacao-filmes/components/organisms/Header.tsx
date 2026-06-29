'use client'

import { useState } from 'react'
import { User, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrainingViewer } from '@/components/organisms/TrainingViewer'
import type { UserProfile } from '@/types'

interface HeaderProps {
  user: UserProfile | null
  onOpenUserModal: () => void
}

export function Header({ user, onOpenUserModal }: HeaderProps) {
  const [showTraining, setShowTraining] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Movie<span className="text-white">Recommend</span>
            </h1>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <span className="text-white font-medium">Home</span>
              <span className="hover:text-white cursor-pointer transition-colors">
                Movies
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">
                My List
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTraining(true)}
              title="Model Training Status"
            >
              <Cpu className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenUserModal}
              title={
                user
                  ? `User (born ${user.birthYear})`
                  : 'Select User'
              }
            >
              {user ? (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                  {String(user.birthYear).slice(-2)}
                </div>
              ) : (
                <User className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {showTraining && (
        <TrainingViewer onClose={() => setShowTraining(false)} />
      )}
    </>
  )
}
