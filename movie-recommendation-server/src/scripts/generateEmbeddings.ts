import { db } from '../infrastructure/database/drizzle/client.js'
import { DrizzleMovieRepository } from '../infrastructure/repositories/DrizzleMovieRepository.js'
import { DrizzleRatingRepository } from '../infrastructure/repositories/DrizzleRatingRepository.js'
import { DrizzleUserRepository } from '../infrastructure/repositories/DrizzleUserRepository.js'
import { makeMovieContext, encodeMovie } from '../ml/embeddings/movieEmbedding.js'

const movieRepo = new DrizzleMovieRepository(db)
const ratingRepo = new DrizzleRatingRepository(db)
const userRepo = new DrizzleUserRepository(db)

console.log('Loading movies, ratings, and users...')
const [movies, ratings, users] = await Promise.all([
  movieRepo.findAll(),
  ratingRepo.findAll(),
  userRepo.findAll(),
])
console.log(`  ${movies.length} movies, ${ratings.length} ratings, ${users.length} users`)

const context = makeMovieContext(movies, ratings, users)
console.log(`  vector dimensions: ${context.dimensions}`)
console.log('Generating and persisting embeddings...')

let done = 0
for (const movie of movies) {
  const vector = encodeMovie(movie, context);
  const embedding = vector.arraySync();
  vector.dispose()

  await movieRepo.updateEmbedding(movie.id, embedding)

  done++
  if (done % 500 === 0 || done === movies.length) {
    process.stdout.write(`\r  ${done}/${movies.length}`)
  }
}

console.log('\nDone.')
process.exit(0)
