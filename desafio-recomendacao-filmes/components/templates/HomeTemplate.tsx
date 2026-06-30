'use client'

import { useState, useMemo, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/organisms/Header'
import { Hero } from '@/components/organisms/Hero'
import { MovieCarousel } from '@/components/organisms/MovieCarousel'
import { UserSelectModal } from '@/components/organisms/UserSelectModal'
import { useGenreMovies } from '@/hooks/useGenreMovies'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useUserRatings, useAverageRatings, useCreateRating } from '@/hooks/useRatings'
import { getUsers } from '@/services/users'
import type { UserProfile, Movie } from '@/types'

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

const BATCH_SIZE = 3

export function HomeTemplate() {
  const queryClient = useQueryClient()
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [visibleGenreCount, setVisibleGenreCount] = useState(BATCH_SIZE)

  const handleOpenModal = useCallback(() => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['users', 'infinite'],
      queryFn: ({ pageParam }) => getUsers(pageParam, 20),
      initialPageParam: 1,
    })
    setUserModalOpen(true)
  }, [queryClient])

  const visibleGenres = useMemo(
    () => GENRES.slice(0, visibleGenreCount),
    [visibleGenreCount],
  )

  const { genreMap, isLoadingSome, isLoadingFirstBatch } =
    useGenreMovies(visibleGenres)

  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem('movieCurrentUser')
      return saved ? (JSON.parse(saved) as UserProfile) : null
    } catch {
      return null
    }
  })

  const handleSelectUser = (u: UserProfile) => {
    setUser(u)
    localStorage.setItem('movieCurrentUser', JSON.stringify(u))
  }

  const { data: recommendations = [] } = useRecommendations(
    user?.id ?? null,
  )
  const { data: ratings = [] } = useUserRatings(user?.id ?? null)
  const { data: averageRatings = [] } = useAverageRatings()
  const { mutate: like } = useCreateRating(user?.id ?? null)

  const likedMovieIds = useMemo(
    () => new Set(ratings.map((r) => r.movieId)),
    [ratings],
  )

  const movieRatings = useMemo(
    () => new Map(averageRatings.map((r) => [r.movieId, r.averageRating])),
    [averageRatings],
  )

  const handleLike = useMemo(
    () =>
      user
        ? (movieId: string) => {
            if (!likedMovieIds.has(movieId)) {
              like({ movieId, rating: 5 })
            }
          }
        : undefined,
    [user, like, likedMovieIds],
  )

  const hasMoreGenres = visibleGenreCount < GENRES.length

  const { ref: sentinelRef } = useInView({
    rootMargin: '400px',
    onChange: (inView) => {
      if (inView) {
        setVisibleGenreCount((prev) => prev + BATCH_SIZE)
      }
    },
  })

  const firstGenreMovies =
    genreMap.get(GENRES[0]!)?.data ?? ([] as Movie[])

  const heroMovie = useMemo(() => {
    if (!firstGenreMovies.length) return null
    const candidates = firstGenreMovies.filter(
      (m) => (m.releaseYear ?? 0) > 1990,
    )
    const pool = candidates.length > 0 ? candidates : firstGenreMovies
    const idx = (pool.length * 7) % Math.min(pool.length, 20)
    return pool[idx] ?? null
  }, [firstGenreMovies])

  if (isLoadingFirstBatch) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header
          user={user}
          onOpenUserModal={handleOpenModal}
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
                movieRatings={movieRatings}
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

            {!user ? (
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
                    onClick={handleOpenModal}
                    className="bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              </section>
            ) : null}

            {visibleGenres.map((genre) => {
              const result = genreMap.get(genre)
              const movies = result?.data ?? []

              if (!result && isLoadingSome) {
                return (
                  <section
                    key={genre}
                    className="px-6 md:px-15 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <h2 className="text-xl font-semibold text-white">
                        {genre}
                      </h2>
                    </div>
                  </section>
                )
              }

              if (!movies.length) return null

              return (
                <MovieCarousel
                  key={genre}
                  title={genre}
                  movies={movies}
                  likedMovieIds={likedMovieIds}
                  movieRatings={movieRatings}
                  onLike={handleLike}
                />
              )
            })}

            {hasMoreGenres && (
              <div ref={sentinelRef} className="h-4" />
            )}
          </div>
        </main>
      </div>

      <UserSelectModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        onSelectUser={handleSelectUser}
        currentUser={user}
      />
    </>
  )
}
