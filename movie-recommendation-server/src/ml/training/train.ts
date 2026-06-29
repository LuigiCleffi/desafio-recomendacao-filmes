import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import * as tf from '@tensorflow/tfjs-node'
import { db } from '../../infrastructure/database/drizzle/client.js'
import { DrizzleMovieRepository } from '../../infrastructure/repositories/DrizzleMovieRepository.js'
import { DrizzleUserRepository } from '../../infrastructure/repositories/DrizzleUserRepository.js'
import { DrizzleRatingRepository } from '../../infrastructure/repositories/DrizzleRatingRepository.js'
import type { Rating } from '../../domain/entities/Recommendation.js'
import { makeMovieContext, encodeMovie } from '../embeddings/movieEmbedding.js'
import { makeUserContext } from '../embeddings/userEmbedding.js'
import { createTrainingData } from './datasetLoader.js'
import { configureNeuralNetAndTrain, saveModel } from '../models/recommendationModel.js'

async function trainModel() {
  console.log('Loading data...')
  const movieRepo = new DrizzleMovieRepository(db)
  const userRepo = new DrizzleUserRepository(db)
  const ratingRepo = new DrizzleRatingRepository(db)

  const [allMovies, allUsers, allRatings] = await Promise.all([
    movieRepo.findAll(),
    userRepo.findAll(),
    ratingRepo.findAll(),
  ])

  console.log(`  Movies: ${allMovies.length}`)
  console.log(`  Users: ${allUsers.length}`)
  console.log(`  Ratings: ${allRatings.length}`)

  if (allRatings.length === 0) {
    console.error('No ratings found. Run `npm run db:seed` first.')
    process.exit(1)
  }

  // Build contexts (like makeContext() in browser worker)
  console.log('Building contexts...')
  const movieContext = makeMovieContext(allMovies, allRatings, allUsers)
  const userContext = makeUserContext(allUsers, allMovies, movieContext)

  // Pre-compute movie vectors (like context.productVectors in browser worker)
  const movieVectors = allMovies.map(m => {
    const t = encodeMovie(m, movieContext)
    const vector = Array.from(t.dataSync())
    t.dispose()
    return { movieId: m.id, meta: { ...m }, vector }
  })

  // Build per-user rating lookups in one pass
  const ratedByUser = new Map<string, Set<string>>()
  const ratingsByUser = new Map<string, Rating[]>()
  for (const r of allRatings) {
    const set = ratedByUser.get(r.userId) ?? new Set()
    set.add(r.movieId)
    ratedByUser.set(r.userId, set)

    const list = ratingsByUser.get(r.userId) ?? []
    list.push(r)
    ratingsByUser.set(r.userId, list)
  }

  const context = {
    movieContext,
    userContext,
    users: allUsers,
    movieVectors,
    ratedByUser,
    ratingsByUser,
    inputDim: userContext.dimensions + movieContext.dimensions,
  }

  // Create training data
  const trainData = createTrainingData(context)

  console.log(`  Training pairs: ${trainData.xs.shape[0]}`)
  console.log(`  Input dimension: ${trainData.inputDim}`)

  if (trainData.xs.shape[0] === 0) {
    console.error('No training pairs generated.')
    process.exit(1)
  }

  // Train neural network
  console.log('Training neural network...')
  const model = await configureNeuralNetAndTrain(trainData, (epoch, logs) => {
    const acc = logs.acc !== undefined ? `, acc=${Number(logs.acc).toFixed(4)}` : ''
    const valAcc = logs.val_acc !== undefined ? `, val_acc=${Number(logs.val_acc).toFixed(4)}` : ''
    console.log(
      `  Epoch ${epoch}: loss=${Number(logs.loss).toFixed(4)}${acc}, val_loss=${logs.val_loss !== undefined ? Number(logs.val_loss).toFixed(4) : 'N/A'}${valAcc}`,
    )
  })

  // Save model
  const modelDir = resolve(process.cwd(), 'model')
  if (!existsSync(modelDir)) {
    mkdirSync(modelDir, { recursive: true })
  }

  console.log(`Saving model to ${modelDir}...`)
  await saveModel(model, modelDir)

  console.log('Training complete!')

  // Cleanup
  trainData.xs.dispose()
  trainData.ys.dispose()
  model.dispose()
}

trainModel()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
