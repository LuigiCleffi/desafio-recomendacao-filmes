import * as tf from '@tensorflow/tfjs-node'
import type { User } from '../../domain/entities/User.js'
import type { Movie } from '../../domain/entities/Movie.js'
import type { Rating } from '../../domain/entities/Recommendation.js'
import { encodeMovie, WEIGHTS, VIEWER_BIRTH_YEAR_SLOT, type MovieContext } from './movieEmbedding.js'
import { normalize } from './helpers/normalize.js';

export interface UserContext {
  minBirthYear: number
  maxBirthYear: number
  movieById: Map<string, Movie> // O(1) movie lookup for encodeUser
  dimensions: number            // must match MovieContext.dimensions
}

export function makeUserContext(
  users: User[],
  movies: Movie[],
  movieContext: MovieContext,
): UserContext {
  return {
    minBirthYear: movieContext.viewerBirthYearMin,
    maxBirthYear: movieContext.viewerBirthYearMax,
    movieById: new Map(movies.map(m => [m.id, m])),
    dimensions: movieContext.dimensions,
  }
}

// A user is represented as the mean of the movie vectors they have rated,
// placing users and movies in the same embedding space.
// New users with no ratings fall back to a sparse vector encoding only their birth year
// in the viewerBirthYear slot (index 2), matching the position in movie vectors.
export const encodeUser = (
  user: User,
  userRatings: Rating[],
  movieContext: MovieContext,
  userContext: UserContext,
): tf.Tensor1D =>
  tf.tidy(() => {
    const ratedMovies = userRatings
      .map(r => userContext.movieById.get(r.movieId))
      .filter(m => m !== undefined)

    if (ratedMovies.length > 0) {
      const stacked = tf.stack(ratedMovies.map(m => encodeMovie(m, movieContext)))
      return stacked.mean(0) as tf.Tensor1D
    }

    // Birth year fallback: all zeros except the viewerBirthYear slot
    const birthYearVal =
      normalize(user.birthYear, userContext.minBirthYear, userContext.maxBirthYear)
      * WEIGHTS.viewerBirthYear

    const fallback = new Array<number>(userContext.dimensions).fill(0)
    fallback[VIEWER_BIRTH_YEAR_SLOT] = birthYearVal
    return tf.tensor1d(fallback)
  })
