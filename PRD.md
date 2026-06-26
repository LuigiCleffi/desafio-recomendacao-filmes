# PRD — Desafio 01: Movie Recommendation System

## Overview

A monorepo containing a Next.js frontend (`desafio-recomendacao-filmes`) and a Fastify REST API (`movie-recommendation-server`). The backend implements a movie recommendation engine using TensorFlow.js with Neural Collaborative Filtering (NCF), backed by PostgreSQL + pgvector.

---

## Architecture

```
desafio-recomendacao-filmes/   ← Next.js frontend (UI)
movie-recommendation-server/   ← Fastify API + TF.js ML pipeline
  src/
    domain/            ← Entities & repository interfaces
    application/       ← Use cases
    infrastructure/    ← DB (Drizzle/PostgreSQL) + ML model
    interfaces/http/   ← Fastify routes
    ml/                ← TensorFlow.js training pipeline
    workers/           ← Background training worker thread
```

---

## Status

### Completed

- [x] Domain entities: `Movie`, `User`, `Rating`, `Recommendation`
- [x] Repository interfaces: `MovieRepository`, `UserRepository`, `RatingRepository`
- [x] Drizzle implementations: `DrizzleMovieRepository`, `DrizzleUserRepository`, `DrizzleRatingRepository`
- [x] Database schema with pgvector: `movies`, `users`, `ratings`, `movie_recommendations`
- [x] HNSW index on `movies.embedding` for cosine similarity search
- [x] `RecommendationModel` domain interface (`predict`, `recommend`)
- [x] Content-based recommendation use case (`GetMovieRecommendationsUseCase`) via vector cosine distance
- [x] HTTP routes: `GET /movies`, `GET /movies/:id`, `POST /movies`, `GET /movies/:id/recommendations`
- [x] Seed data files: `movies.csv` (MovieLens), `movie_recommendation_users_8000.csv`
- [x] `@tensorflow/tfjs-node` installed

---

## Missing — ML Pipeline

### 3. Seed Script

**File:** `movie-recommendation-server/src/scripts/seed.ts`

Parse `data/movies.csv` and `data/movie_recommendation_users_8000.csv` (MovieLens format: `userId,movieId,rating,timestamp`) and insert rows into the `users`, `movies`, and `ratings` tables via `DrizzleUserRepository` / `DrizzleRatingRepository`.

**Acceptance criteria:**
- Idempotent (upsert by `externalId`)
- Logs progress every 1 000 rows
- Runnable via `npm run db:seed`

---

### 4. Dataset Loader

**File:** `movie-recommendation-server/src/ml/training/datasetLoader.ts`

Fetch all rows from `ratings`, map string UUIDs to contiguous integer indices (required by TF.js embedding layers), and return tensors ready for training.

**Outputs:**
```ts
{
  userTensor: tf.Tensor1D       // integer user indices
  movieTensor: tf.Tensor1D      // integer movie indices
  ratingTensor: tf.Tensor1D     // normalized ratings [0, 1]
  numUsers: number
  numMovies: number
  userIndexMap: Map<string, number>   // uuid → int
  movieIndexMap: Map<string, number>  // uuid → int
}
```

---

### 5. Neural Collaborative Filtering Model

**File:** `movie-recommendation-server/src/ml/models/recommendationModel.ts`

Build a TF.js NCF model:

```
user_id  ──► Embedding(numUsers,  embeddingDim) ──►┐
                                                     ├─► Flatten ─► Dense(64, relu) ─► Dense(32, relu) ─► Dense(1, sigmoid)
movie_id ──► Embedding(numMovies, embeddingDim) ──►┘
```

- `embeddingDim`: 32 (tunable)
- Loss: `meanSquaredError`
- Optimizer: `adam`
- Export `buildModel(numUsers, numMovies, embeddingDim?)` factory

---

### 6. Training Script

**File:** `movie-recommendation-server/src/ml/training/train.ts`

Full pipeline:
1. Call `loadDataset()` from step 4
2. Build model via `buildModel(numUsers, numMovies)`
3. Train with `model.fit()` (80/20 train/val split, early stopping on val loss)
4. Save model to `./model/` via `model.save('file://./model')`
5. Save index maps to `./model/indexMaps.json`

**Acceptance criteria:**
- Runnable via `npm run ml:train`
- Logs epoch loss and val loss
- Final val RMSE < 1.0 on the MovieLens subset

---

### 7. TensorflowRecommendationModel — Inference

**File:** `movie-recommendation-server/src/infrastructure/ml/TensorFlowRecommendationModel.ts`

Implement the `RecommendationModel` interface:

- **Constructor:** Load model from `./model/` and index maps from `./model/indexMaps.json` on startup
- **`predict(userId, movieId)`:** Run single forward pass; return score `[0, 1]`
- **`recommend(userId, limit)`:** Score all movies for the user in a batched tensor; return top-N movie UUIDs sorted by score descending, excluding movies the user has already rated

---

### 8. GetUserRecommendationsUseCase

**File:** `movie-recommendation-server/src/application/use-cases/GetUserRecommendationsUseCase.ts`

```ts
execute(userId: string, limit = 10): Promise<Movie[]>
```

1. Call `model.recommend(userId, limit)` to get movie IDs
2. Fetch full `Movie` objects via `MovieRepository.findById` for each ID
3. Return in score order

---

### 9. Wire Into App

**File:** `movie-recommendation-server/src/main/index.ts`

Instantiate `TensorflowRecommendationModel` and `GetUserRecommendationsUseCase`, inject into `buildApp`.

---

### 10. User Recommendations Route

**File:** `movie-recommendation-server/src/interfaces/http/routes/users.ts`

```
GET /users/:id/recommendations?limit=10
→ 200 Movie[]
→ 404 if user not found
```

Register under `/users` prefix in `app.ts`.

---

### 11. Model Training Worker Thread

**File:** `movie-recommendation-server/src/workers/modelTrainingWorker.ts`

Wrap the training pipeline in a `worker_threads` Worker so training does not block the HTTP event loop. Expose a trigger endpoint:

```
POST /admin/train
→ 202 { status: 'training_started' }
```

The worker emits progress events (`parentPort.postMessage`) so the main thread can log epoch updates.

---

## Data

| File | Format | Rows |
|---|---|---|
| `data/movies.csv` | `movieId,title,genres` | ~9 000 |
| `data/movie_recommendation_users_8000.csv` | `userId,movieId,rating,timestamp` | ~8 000 users |

Source: [MovieLens](https://grouplens.org/datasets/movielens/)

---

## Environment Variables

See `movie-recommendation-server/.env.example`:

```
POSTGRES_USER=movies_user
POSTGRES_PASSWORD=movies_pass
POSTGRES_DB=movies_db
DATABASE_URL=postgresql://movies_user:movies_pass@localhost:5432/movies_db
PORT=3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| API | Fastify 5, TypeBox, TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 + pgvector (HNSW index) |
| ML | TensorFlow.js (`@tensorflow/tfjs-node`) |
| Containerization | Docker + docker-compose |
