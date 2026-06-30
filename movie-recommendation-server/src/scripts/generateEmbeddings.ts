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

const BATCH_SIZE = 50
let done = 0

for (let i = 0; i < movies.length; i += BATCH_SIZE) {
  const batch = movies.slice(i, i + BATCH_SIZE)

  await Promise.all(batch.map(async (movie) => {
    const vector = encodeMovie(movie, context)
    const embedding = vector.arraySync()
    vector.dispose()
    await movieRepo.updateEmbedding(movie.id, embedding)
  }))

  done += batch.length
  process.stdout.write(`\r  ${done}/${movies.length}`)
}

console.log('\nDone.')
process.exit(0)
