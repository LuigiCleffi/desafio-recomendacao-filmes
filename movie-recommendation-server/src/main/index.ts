import closeWithGrace from 'close-with-grace'
import { db } from '../infrastructure/database/drizzle/client.js'
import { DrizzleMovieRepository } from '../infrastructure/repositories/DrizzleMovieRepository.js'
import { GetMoviesUseCase } from '../application/use-cases/GetMoviesUseCase.js'
import { GetMovieByIdUseCase } from '../application/use-cases/GetMovieByIdUseCase.js'
import { CreateMovieUseCase } from '../application/use-cases/CreateMovieUseCase.js'
import { GetMovieRecommendationsUseCase } from '../application/use-cases/GetMovieRecommendationsUseCase.js'
import { buildApp } from '../interfaces/http/app.js'

const movieRepository = new DrizzleMovieRepository(db)

const getMovies = new GetMoviesUseCase(movieRepository)
const getMovieById = new GetMovieByIdUseCase(movieRepository)
const createMovie = new CreateMovieUseCase(movieRepository)
const getRecommendations = new GetMovieRecommendationsUseCase(movieRepository)

const app = buildApp({ getMovies, getMovieById, createMovie, getRecommendations })

closeWithGrace({ delay: 10_000 }, async ({ err }) => {
  if (err) app.log.error(err)
  await app.close()
})

const port = Number(process.env['PORT'] ?? 3000)
await app.listen({ port, host: '0.0.0.0' })
