import { db } from '../infrastructure/database/drizzle/client.js'
import { DrizzleMovieRepository } from '../infrastructure/repositories/DrizzleMovieRepository.js'
import { DrizzleRatingRepository } from '../infrastructure/repositories/DrizzleRatingRepository.js'
import { DrizzleUserRepository } from '../infrastructure/repositories/DrizzleUserRepository.js'
import { makeMovieContext, encodeMovie } from '../ml/embeddings/movieEmbedding.js'

const movieRepo = new DrizzleMovieRepository(db)
const ratingRepo = new DrizzleRatingRepository(db)
const userRepo = new DrizzleUserRepository(db)

const [movies, ratings, users] = await Promise.all([
  movieRepo.findAll(),
  ratingRepo.findAll(),
  userRepo.findAll(),
])

console.log(`Loaded ${movies.length} movies, ${ratings.length} ratings, ${users.length} users from DB`)

const context = makeMovieContext(movies, ratings, users)

console.log('Context:')
console.log(`  year range:        ${context.minYear} – ${context.maxYear}`)
console.log(`  rating range:      0 – 5 (fixed scale)`)
  console.log(`  birth year range:  ${context.viewerBirthYearMin} – ${context.viewerBirthYearMax}`)
console.log(`  numGenres:         ${context.numGenres}`)
console.log(`  dimensions:        ${context.dimensions}`)

const movie = movies[Math.floor(Math.random() * 10) + 1]!
const avgRating = context.movieRatings[movie.id]
console.log(`\nEncoding: "${movie.title}" | genres: [${movie.genres.join(', ')}] | year: ${movie.releaseYear} | avgRating: ${avgRating?.toFixed(2) ?? 'none'}`)

const vector = encodeMovie(movie, context)
console.log(`\nVector (length ${vector.shape[0]}):`)
console.log(vector.arraySync())

process.exit(0)
