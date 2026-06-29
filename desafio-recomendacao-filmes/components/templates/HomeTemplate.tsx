'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/organisms/Header'
import { Hero } from '@/components/organisms/Hero'
import { MovieCarousel } from '@/components/organisms/MovieCarousel'
import { UserSelectModal } from '@/components/organisms/UserSelectModal'
import { useMovies } from '@/hooks/useMovies'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useUserRatings, useCreateRating } from '@/hooks/useRatings'
import { createUser, getUser } from '@/services/users'
import type { UserProfile } from '@/types'

const GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Animation',
  'Documentary',
  'Fantasy',
] as const

export function HomeTemplate() {
  const { data: movies = [], isLoading } = useMovies()
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem('movieCurrentUser')
      return saved ? (JSON.parse(saved) as UserProfile) : null
    } catch {
      return null
    }
  })
  
  const [userSynced, setUserSynced] = useState(false)
  
  const migrationAttemptedFor = useRef<string | null>(null)

  const handleSelectUser = (u: UserProfile) => {
    setUser(u)
    setUserSynced(false)
    migrationAttemptedFor.current = null
    localStorage.setItem('movieCurrentUser', JSON.stringify(u))
  }

  useEffect(() => {
    if (!user) return
    if (migrationAttemptedFor.current === user.id) return
    migrationAttemptedFor.current = user.id

    // Single lookup — avoids fetching all 8000+ seeded users just to check existence
    getUser(user.id)
      .then(() => setUserSynced(true))
      .catch(() => {
        // 404 → stale local user; register them and swap IDs transparently
        createUser(user.birthYear)
          .then(registered => {
            const migrated: UserProfile = { id: registered.id, birthYear: registered.birthYear }
            setUser(migrated)
            localStorage.setItem('movieCurrentUser', JSON.stringify(migrated))
            try {
              const saved = localStorage.getItem('movieLocalUsers')
              if (saved) {
                const list = JSON.parse(saved) as { id: string; birthYear: number }[]
                localStorage.setItem('movieLocalUsers', JSON.stringify(
                  list.map(u => u.id === user.id ? { ...u, id: registered.id } : u)
                ))
              }
            } catch { /* ignore */ }
            setUserSynced(true)
          })
          .catch(() => setUserSynced(true))
      })
  }, [user])

  const { data: recommendations = [] } = useRecommendations(user?.id ?? null)
  const { data: ratings = [] } = useUserRatings(user?.id ?? null)
  const { mutate: like } = useCreateRating(user?.id ?? null)

  const likedMovieIds = useMemo(
    () => new Set(ratings.map(r => r.movieId)),
    [ratings],
  )

  // Only expose the like handler once the user is confirmed in the DB
  const handleLike = useMemo(
    () =>
      user && userSynced
        ? (movieId: string) => {
            if (!likedMovieIds.has(movieId)) {
              like({ movieId, rating: 5 })
            }
          }
        : undefined,
    [user, userSynced, like, likedMovieIds],
  )

  const genreMap = useMemo(() => {
    const map = new Map<string, typeof movies>()
    for (const genre of GENRES) {
      const filtered = movies.filter((m) => m.genres.includes(genre))
      if (filtered.length > 0) map.set(genre, filtered)
    }
    return map
  }, [movies])

  const heroMovie = useMemo(() => {
    if (!movies.length) return null
    const candidates = movies.filter((m) => (m.releaseYear ?? 0) > 1990)
    const pool = candidates.length > 0 ? candidates : movies
    const idx = (pool.length * 7) % Math.min(pool.length, 20)
    return pool[idx] ?? null
  }, [movies])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onOpenUserModal={() => setUserModalOpen(true)}
      />

      <main className="pb-16">
        {heroMovie && <Hero movie={heroMovie} />}

        <div
          className={
            heroMovie
              ? '-mt-32 relative z-20 space-y-8'
              : 'pt-20 space-y-8'
          }
        >
          {user && recommendations.length > 0 && (
            <MovieCarousel
              title="Recommended for You"
              badge="AI Picks"
              movies={recommendations}
              likedMovieIds={likedMovieIds}
              onLike={handleLike}
            />
          )}

          {user && recommendations.length === 0 && (
            <section className="px-6 md:px-15">
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <p className="text-muted-foreground">
                  No recommendations yet. Train the model to get
                  personalized suggestions.
                </p>
              </div>
            </section>
          )}

          {!user && (
            <section className="px-6 md:px-15 pt-8">
              <div className="bg-linear-to-r from-primary/10 to-transparent rounded-lg p-8 border border-primary/20">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to MovieRecommend
                </h2>
                <p className="text-muted-foreground mb-4">
                  Create a profile to get AI-powered movie
                  recommendations tailored to your age and preferences.
                </p>
                <button
                  onClick={() => setUserModalOpen(true)}
                  className="bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </button>
              </div>
            </section>
          )}

          {Array.from(genreMap.entries()).map(([genre, genreMovies]) => (
            <MovieCarousel
              key={genre}
              title={genre}
              movies={genreMovies}
              likedMovieIds={likedMovieIds}
              onLike={handleLike}
            />
          ))}
        </div>
      </main>

      <UserSelectModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        onSelectUser={handleSelectUser}
        currentUser={user}
      />
    </div>
  )
}
