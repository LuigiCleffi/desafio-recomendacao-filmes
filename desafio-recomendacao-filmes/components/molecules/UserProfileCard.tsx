'use client'

import { Check } from 'lucide-react'

interface UserProfileCardProps {
  birthYear: number
  isSelected: boolean
  onSelect: () => void
}

export function UserProfileCard({
  birthYear,
  isSelected,
  onSelect,
}: UserProfileCardProps) {
  const age = new Date().getFullYear() - birthYear

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
        isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-accent'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">🎬</span>
        <div>
          <span className="font-medium">Born {birthYear}</span>
          <span className="text-muted-foreground ml-2">
            (Age {age})
          </span>
        </div>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary" />}
    </button>
  )
}
