import * as tf from '@tensorflow/tfjs-node'
import type { Movie, Genre } from '../../domain/entities/Movie.js'
import { GENRE_VALUES } from '../../domain/entities/Movie.js'
import type { Rating } from '../../domain/entities/Recommendation.js'
import type { User } from '../../domain/entities/User.js'
import { createMultiHotWeighted } from './helpers/multi-hot-end.js';
import { normalize } from './helpers/normalize.js';

const RATING_RANGE = { min: 0, max: 5 }
const NO_RATING_FALLBACK = 0

// Fixed scalar features added before the genre vector
const SCALAR_DIMS = 3 // year + rating + viewerBirthYear
// Exported so encodeUser's cold-start fallback writes into the correct position
export const VIEWER_BIRTH_YEAR_SLOT = 2

export interface MovieContext {
  genresIndex: Record<Genre, number>
  numGenres: number
  minYear: number
  maxYear: number
  // Bounds for the "avg birth year of raters" feature encoded per movie
  viewerBirthYearMin: number
  viewerBirthYearMax: number
  movieRatings: Record<string, number>            // movieId → average user rating
  movieAvgViewerBirthYear: Record<string, number> // movieId → avg birth year of raters
  dimensions: number                              // SCALAR_DIMS + numGenres
}

// Exported so userEmbedding can encode the birth year slot with the same weight
export const WEIGHTS = {
  year: 0.1,
  genres: 0.8,
  // Rating is weighted highest: a strongly-liked or strongly-disliked movie
  // should cluster more tightly with similarly-received movies than with
  // same-genre movies that users feel differently about.
  rating: 0.9,
  // Era affinity: movies appeal to specific generations of viewers.
  viewerBirthYear: 0.6,
}


export function makeMovieContext(movies: Movie[], ratings: Rating[], users: User[]): MovieContext {
  const years = movies
    .map((m) => m.releaseYear)
    .filter(y => y !== null)

  if (years.length === 0) {
    throw new Error('makeMovieContext: no movies with a valid releaseYear')
  }

  // Avoid spreading into Math.min/max — blows the call stack on large catalogs
  const minYear = years.reduce((min, y) => Math.min(min, y), Infinity)
  const maxYear = years.reduce((max, y) => Math.max(max, y), -Infinity)

  // Genre index is built from the fixed known set, not derived from data,
  // so the vector size is always stable regardless of which movies are loaded.
  const genresIndex = Object.fromEntries(
    GENRE_VALUES.map((genre, index) => [genre, index]),
  ) as Record<Genre, number>

  const numGenres = GENRE_VALUES.length

  // Build userId → birthYear lookup; compute birth year bounds in the same pass
  const userBirthYears: Record<string, number> = {}
  let viewerBirthYearMin = Infinity
  let viewerBirthYearMax = -Infinity
  for (const u of users) {
    userBirthYears[u.id] = u.birthYear
    if (u.birthYear < viewerBirthYearMin) viewerBirthYearMin = u.birthYear
    if (u.birthYear > viewerBirthYearMax) viewerBirthYearMax = u.birthYear
  }

  // Single pass over ratings: accumulate avg rating and avg viewer birth year per movie
  const movieSums: Record<string, { ratingSum: number; birthYearSum: number; ratingCount: number; birthYearCount: number }> = {}
  for (const r of ratings) {
    const entry = movieSums[r.movieId] ?? { ratingSum: 0, birthYearSum: 0, ratingCount: 0, birthYearCount: 0 }
    entry.ratingSum += r.rating
    entry.ratingCount += 1
    const birthYear = userBirthYears[r.userId]
    if (birthYear !== undefined) {
      entry.birthYearSum += birthYear
      entry.birthYearCount += 1
    }
    movieSums[r.movieId] = entry
  }

  const movieRatings: Record<string, number> = {}
  const movieAvgViewerBirthYear: Record<string, number> = {}
  for (const [movieId, { ratingSum, birthYearSum, ratingCount, birthYearCount }] of Object.entries(movieSums)) {
    movieRatings[movieId] = ratingSum / ratingCount
    if (birthYearCount > 0) movieAvgViewerBirthYear[movieId] = birthYearSum / birthYearCount
  }

  return {
    genresIndex,
    numGenres,
    minYear,
    maxYear,
    viewerBirthYearMin,
    viewerBirthYearMax,
    movieRatings,
    movieAvgViewerBirthYear,
    dimensions: SCALAR_DIMS + numGenres,
  }
}

// tf.tidy disposes intermediate tensors automatically, preventing memory
// leaks in the C++ TensorFlow.js Node backend.
export const encodeMovie = (movie: Movie, context: MovieContext): tf.Tensor1D =>
  tf.tidy(() => {
    const yearVal =
      normalize(
        movie.releaseYear ?? context.minYear,
        context.minYear,
        context.maxYear,
      ) * WEIGHTS.year

    const avgRating = context.movieRatings[movie.id] ?? NO_RATING_FALLBACK
    const ratingVal =
      normalize(avgRating, RATING_RANGE.min, RATING_RANGE.max) * WEIGHTS.rating

    // Falls back to the mid-point of the birth year range for unrated movies
    const midBirthYear = (context.viewerBirthYearMin + context.viewerBirthYearMax) / 2
    const avgViewerBirthYear = context.movieAvgViewerBirthYear[movie.id] ?? midBirthYear
    const viewerBirthYearVal =
      normalize(avgViewerBirthYear, context.viewerBirthYearMin, context.viewerBirthYearMax)
      * WEIGHTS.viewerBirthYear

    const genreIndices = movie.genres
      .map(g => context.genresIndex[g])
      .filter(i => i !== undefined)

    const genres = createMultiHotWeighted(genreIndices, context.numGenres, WEIGHTS.genres)

    return tf.concat1d([tf.tensor1d([yearVal, ratingVal, viewerBirthYearVal]), genres])
  })
