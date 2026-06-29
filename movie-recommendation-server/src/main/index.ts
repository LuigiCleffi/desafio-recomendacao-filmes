import closeWithGrace from 'close-with-grace'
import { db } from '../infrastructure/database/drizzle/client.js'
import { DrizzleMovieRepository } from '../infrastructure/repositories/DrizzleMovieRepository.js'
import { DrizzleUserRepository } from '../infrastructure/repositories/DrizzleUserRepository.js'
import { DrizzleRatingRepository } from '../infrastructure/repositories/DrizzleRatingRepository.js'
import { TensorflowRecommendationModel } from '../infrastructure/ml/TensorFlowRecommendationModel.js'
import { GetMoviesUseCase } from '../application/use-cases/GetMoviesUseCase.js'
import { GetMovieByIdUseCase } from '../application/use-cases/GetMovieByIdUseCase.js'
import { CreateMovieUseCase } from '../application/use-cases/CreateMovieUseCase.js'
import { GetMovieRecommendationsUseCase } from '../application/use-cases/GetMovieRecommendationsUseCase.js'
import { GetUserRecommendationsUseCase } from '../application/use-cases/GetUserRecommendationsUseCase.js'
import { buildApp } from '../interfaces/http/app.js'

const movieRepository = new DrizzleMovieRepository(db)
const userRepository = new DrizzleUserRepository(db)
const ratingRepository = new DrizzleRatingRepository(db)
const getMovies = new GetMoviesUseCase(movieRepository)
const getMovieById = new GetMovieByIdUseCase(movieRepository)
const createMovie = new CreateMovieUseCase(movieRepository)
const getRecommendations = new GetMovieRecommendationsUseCase(movieRepository)

const recommendationModel = new TensorflowRecommendationModel('./model', movieRepository, ratingRepository)
try {
  await recommendationModel.load()
  console.log('NCF model loaded successfully')
} catch (err) {
  console.warn('NCF model not available. Run `npm run ml:train` first.')
}

const getUserRecommendations = new GetUserRecommendationsUseCase(
  userRepository,
  movieRepository,
  recommendationModel,
)

const app = await buildApp({
  movieRepository,
  userRepository,
  ratingRepository,
  getMovies,
  getMovieById,
  createMovie,
  getRecommendations,
  getUserRecommendations,
  recommendationModel,
})

closeWithGrace({ delay: 10_000 }, async ({ err }) => {
  if (err) app.log.error(err)
  await app.close()
})

const port = Number(process.env['PORT'] ?? 3001)
await app.listen({ port, host: '0.0.0.0' })
