'use client'

import { useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { MovieCard } from '@/components/molecules/MovieCard'
import type { Movie } from '@/types'

interface MovieCarouselProps {
  title: string
  movies: Movie[]
  likedMovieIds?: Set<string>
  onLike?: (movieId: string) => void
  badge?: string
}

export function MovieCarousel({ title, movies, likedMovieIds, onLike, badge }: MovieCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
  })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  if (!movies.length) return null

  return (
    <section className="relative group/section">
      <div className="flex items-center gap-3 mb-3 px-6 md:px-15">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {badge && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary border border-primary/40 bg-primary/10 px-2 py-0.5 rounded-full">
            <Sparkles className="h-2.5 w-2.5" />
            {badge}
          </span>
        )}
      </div>

      <div className="relative px-6 md:px-15">
        <button
          onClick={scrollPrev}
          className="absolute left-2 md:left-11 top-0 bottom-0 z-10 hidden group-hover/section:flex items-center justify-center w-10 bg-black/50 hover:bg-black/70 transition-colors rounded-r-md"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {movies.map((movie) => (
              <div className="embla__slide" key={movie.id}>
                <MovieCard
                  movie={movie}
                  isLiked={likedMovieIds?.has(movie.id)}
                  onLike={onLike}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={scrollNext}
          className="absolute right-2 md:right-11 top-0 bottom-0 z-10 hidden group-hover/section:flex items-center justify-center w-10 bg-black/50 hover:bg-black/70 transition-colors rounded-l-md"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </section>
  )
}
