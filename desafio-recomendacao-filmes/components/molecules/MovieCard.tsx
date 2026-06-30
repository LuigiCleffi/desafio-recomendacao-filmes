'use client'

import { Heart } from 'lucide-react'
import type { Movie } from '@/types'

// Each entry is the full gradient class including direction so Tailwind includes it at build time
const GENRE_GRADIENTS: Record<string, string> = {
  Action:      'bg-linear-to-br from-red-800 via-orange-600 to-amber-500',
  Adventure:   'bg-linear-to-tr from-emerald-700 via-teal-600 to-cyan-500',
  Animation:   'bg-linear-to-br from-violet-700 via-purple-600 to-fuchsia-500',
  Children:    'bg-linear-to-tr from-green-600 via-emerald-500 to-teal-400',
  Comedy:      'bg-linear-to-tl from-yellow-600 via-amber-500 to-orange-400',
  Crime:       'bg-linear-to-tl from-zinc-900 via-slate-800 to-zinc-700',
  Documentary: 'bg-linear-to-b  from-stone-700 via-stone-600 to-stone-800',
  Drama:       'bg-linear-to-b  from-blue-900 via-blue-700 to-indigo-600',
  Fantasy:     'bg-linear-to-bl from-fuchsia-700 via-purple-600 to-violet-700',
  'Film-Noir': 'bg-linear-to-t  from-zinc-950 via-zinc-800 to-zinc-700',
  Horror:      'bg-linear-to-t  from-zinc-950 via-purple-950 to-purple-900',
  IMAX:        'bg-linear-to-bl from-sky-700 via-cyan-600 to-blue-500',
  Musical:     'bg-linear-to-tr from-pink-700 via-pink-500 to-rose-400',
  Mystery:     'bg-linear-to-t  from-indigo-950 via-indigo-700 to-violet-600',
  Romance:     'bg-linear-to-bl from-pink-700 via-rose-600 to-red-500',
  'Sci-Fi':    'bg-linear-to-br from-cyan-800 via-blue-600 to-indigo-700',
  Thriller:    'bg-linear-to-tl from-zinc-800 via-slate-700 to-zinc-900',
  War:         'bg-linear-to-br from-stone-900 via-red-900 to-stone-800',
  Western:     'bg-linear-to-b  from-amber-900 via-amber-700 to-yellow-700',
}

function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim()
}

interface MovieCardProps {
  movie: Movie
  rating?: number
  isLiked?: boolean
  onLike?: (movieId: string) => void
}

export function MovieCard({ movie, rating, isLiked = false, onLike }: MovieCardProps) {
  const primaryGenre = movie.genres[0] ?? ''
  const gradient = GENRE_GRADIENTS[primaryGenre] ?? 'bg-linear-to-br from-zinc-700 via-zinc-600 to-zinc-800'
  const cleanTitle = stripYear(movie.title)
  const initial = cleanTitle[0]?.toUpperCase() ?? '?'
  const displayRating = rating != null ? Math.round(rating) : null

  return (
    <div className="group relative cursor-pointer select-none">

      {/* Like button — outside overflow-hidden so it is never clipped by the poster */}
      {onLike && (
        <button
          onClick={(e) => { e.stopPropagation(); onLike(movie.id) }}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className={[
            'absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-sm border',
            'transition-all duration-200',
            isLiked
              ? 'bg-red-500/90 border-red-400/50 opacity-100'
              : 'bg-black/50 border-white/20 opacity-0 group-hover:opacity-100',
          ].join(' ')}
        >
          <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'fill-white text-white' : 'text-white'}`} />
        </button>
      )}

      {/* Poster */}
      <div className={[
        'aspect-2/3 w-full rounded-lg overflow-hidden relative',
        gradient,
        'transition-transform duration-300 ease-out',
        'group-hover:scale-[1.04] group-hover:shadow-2xl group-hover:shadow-black/70',
      ].join(' ')}>

        {/* Radial highlight — gives cards a light-source that breaks the uniform-gradient look */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,rgba(255,255,255,0.14),transparent_55%)]" />

        {/* Noise grain */}
        <div
          className="absolute inset-0 opacity-[0.09] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* Editorial letter — anchored bottom-right, slightly overflowing for intentional bleed */}
        <span
          aria-hidden
          className="absolute -right-2 -bottom-3 text-[7.5rem] font-black leading-none text-white/[0.07] pointer-events-none select-none"
        >
          {initial}
        </span>

        {/* Hover: dark scrim */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300" />

        {/* Star rating — visible on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {displayRating != null ? (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-5 w-5 ${
                    star <= displayRating ? 'text-yellow-400' : 'text-white/30'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-white/50 font-medium tracking-wide uppercase">
              Not rated
            </span>
          )}
        </div>

        {/* Genre chips — slide up on hover */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map(genre => (
              <span
                key={genre}
                className="text-[9px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info below poster */}
      <div className="mt-2 px-0.5">
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-1">
          {cleanTitle}
        </p>
        {movie.releaseYear && (
          <p className="text-[11px] text-white/40 mt-0.5 tabular-nums">{movie.releaseYear}</p>
        )}
      </div>
    </div>
  )
}
