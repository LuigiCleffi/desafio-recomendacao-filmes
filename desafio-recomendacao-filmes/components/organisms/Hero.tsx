'use client'

import { Info, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Movie } from '@/types'

interface HeroProps {
  movie: Movie
}

function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim()
}

export function Hero({ movie }: HeroProps) {
  const cleanTitle = stripYear(movie.title)
  const meta = [movie.releaseYear, ...movie.genres.slice(0, 2)].filter(Boolean).join(' · ')

  return (
    <div className="relative h-[72vh] min-h-120 w-full overflow-hidden">
      {/* Background: atmospheric gradient keyed to primary genre */}
      <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-zinc-950 to-black" />

      {/* Directional overlays for cinematic depth */}
      <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/20 to-transparent" />
      <div className="hero-gradient absolute inset-0 z-10" />

      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="mx-auto w-full max-w-350 px-6 md:px-15">
          <div className="max-w-lg">
            {/* Metadata line — no uppercase, no tracked caps */}
            <p className="text-sm font-medium text-white/50 mb-4 tabular-nums">
              {meta}
            </p>

            <h2
              className="text-5xl md:text-7xl font-bold text-white leading-[0.95] tracking-tight mb-6"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              {cleanTitle}
            </h2>

            {movie.description && (
              <p className="text-sm text-white/70 mb-7 leading-relaxed max-w-sm line-clamp-3">
                {movie.description}
              </p>
            )}

            <div className="flex gap-3">
              <Button className="bg-white text-black hover:bg-white/90 font-semibold px-7 h-10">
                <Play className="h-4 w-4 fill-black mr-1" />
                Play
              </Button>
              <Button
                variant="secondary"
                className="bg-white/10 text-white hover:bg-white/20 font-medium px-7 h-10 border border-white/10"
              >
                <Info className="h-4 w-4 mr-1" />
                More Info
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
