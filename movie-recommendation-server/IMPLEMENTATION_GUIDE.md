# Movie Recommendation Server — Implementation Guide

This document maps the browser worker (`modelTrainingWorker.js`) to the server codebase and describes exactly what needs to be built, in order.

---

## Current State

### What already exists

| Layer | What's there |
|---|---|
| Domain | `Movie`, `User`, `Rating`, `Recommendation` entities + repository interfaces |
| Infrastructure | `DrizzleMovieRepository`, `DrizzleUserRepository`, `DrizzleRatingRepository` (all working) |
| DB Schema | `movies`, `users`, `ratings`, `movie_recommendations` tables |
| HTTP | Fastify app + `/movies` CRUD routes |
| ML stub | `TensorFlowRecommendationModel` — exists but throws `"not implemented"` |
| ML files | `src/ml/{embeddings,models,training}/` — folders exist, files are **empty** |

### What's missing

The entire ML pipeline is empty scaffolding. Nothing trains, nothing predicts.

---

## Data Translation

The browser worker operates on **products + purchases**. This server operates on **movies + ratings**.

| Browser concept | Server equivalent |
|---|---|
| `product.category` → one-hot | `movie.genre` → **multi-hot** (movies have multiple genres, pipe-separated) |
| `product.color` → one-hot | *(drop, no equivalent)* |
| `product.price` → normalized | `movie.releaseYear` → normalized |
| `user.age` → normalized | *(drop, no equivalent in data)* |
| `user.purchases` → binary label (1/0) | `rating.rating` → binary label (`rating >= 4 → 1`, else `0`) |

The neural net architecture (128 → 64 → 32 → 1, sigmoid output, binaryCrossentropy) is reusable as-is.

---

## Steps

### Step 1 — Seed the database

**Files to create:** `src/scripts/seed.ts`

The data lives in two CSVs:
- `data/movies.csv` — 10 329 movies: `movieId, title, genres` (genres pipe-separated, e.g. `"Action|Thriller"`)
- `data/movie_recommendation_users_8000.csv` — ~300 000 ratings: `userId, movieId, rating, timestamp`

The seeder must:
1. Parse `movies.csv`, insert into `movies` table (`externalId = movieId`, extract all unique genres).
2. Parse ratings CSV, upsert users by `externalId`, then insert into `ratings` table linking internal UUIDs.

> **Why a script and not startup logic:** seeding is a one-time operation; baking it into app startup would re-run on every restart.

Add a `"db:seed"` script to `package.json`.

---

### Step 2 — Build movie feature encoding

**File:** `src/ml/embeddings/movieEmbedding.ts`

This is the direct port of `makeContext()`, `normalize()`, `encodeProduct()`, and `encodeUser()` from the browser worker, adapted for movies.

#### 2a. Context

```ts
// Same idea as makeContext(), but for movies
interface MovieContext {
  movies: MovieWithRatings[]      // movies + their avg rating info
  users: UserWithRatings[]        // users + their rated movies
  genresIndex: Record<string, number>  // genre → index in one-hot
  numGenres: number
  minYear: number
  maxYear: number
  dimensions: number              // releaseYear + numGenres
}
```

Build `genresIndex` by collecting **all unique genres** across all movies (split by `|`). Each movie gets a **multi-hot** vector (multiple `1`s) instead of a single one-hot.

#### 2b. Movie vector

```
[releaseYear_normalized, genre_1, genre_2, ..., genre_N]
```

- `releaseYear` → `normalize(year, minYear, maxYear)`
- genres → for each genre in the index, `1` if movie has it, `0` otherwise

#### 2c. User vector

Average of all the movie vectors the user has rated positively (`rating >= 4`). If no positive ratings, use a zero vector.

This is exactly what the browser worker does with `encodeUser()` — mean of purchased product vectors.

---

### Step 3 — Build training dataset

**File:** `src/ml/training/datasetLoader.ts`

Port of `createTrainingData()`. For every user that has at least one rating:
- Build the user vector (Step 2c).
- For every movie in the catalogue:
  - Build the movie vector (Step 2b).
  - Concatenate `[userVector, movieVector]` → input row.
  - Label: `rating >= 4 ? 1 : 0` if the user rated this movie, else `0` (not rated = negative sample).

Return `{ xs: tf.Tensor2d, ys: tf.Tensor2d, inputDimension: number }`.

> **Scale concern:** 8000 users × 10 000 movies = 80 M pairs. You can't load all of that. Sample negatives: for each user, take all their positive ratings + an equal number of random unrated movies as negatives. This is called **negative sampling** and is standard practice.

---

### Step 4 — Neural net model

**File:** `src/ml/models/recommendationModel.ts`

Copy `configureNeuralNetAndTrain()` from the browser worker almost verbatim. The only differences:
- Import from `@tensorflow/tfjs-node` instead of the CDN import.
- Add model **save/load** using `model.save('file://./saved-model')` and `tf.loadLayersModel('file://./saved-model/model.json')`.
- Remove `postMessage` callbacks — instead accept an optional `onEpochEnd` callback parameter.

```ts
export async function trainRecommendationModel(
  trainData: TrainData,
  onEpochEnd?: (epoch: number, logs: tf.Logs) => void
): Promise<tf.LayersModel>

export async function loadRecommendationModel(
  path: string
): Promise<tf.LayersModel>
```

---

### Step 5 — Wire the ML service

**File:** `src/infrastructure/ml/TensorFlowRecommendationModel.ts`

Implement the `RecommendationModel` interface by composing Steps 2–4:

```ts
class TensorflowRecommendationModel implements RecommendationModel {
  private model: tf.LayersModel | null = null
  private context: MovieContext | null = null

  async train(): Promise<void>          // load data → build context → train → save model
  async load(): Promise<void>           // load saved model + rebuild context from DB
  async recommend(userId: string, limit: number): Promise<string[]>
  async predict(userId: string, movieId: string): Promise<number>
}
```

`recommend()` is the port of the browser worker's `recommend()` function:
1. Encode the user.
2. Build `[userVector, movieVector]` for all movies.
3. Run `model.predict()` on the batch.
4. Sort by score, return top-`limit` movie IDs.

---

### Step 6 — Training endpoint or startup trigger

**Decision: explicit HTTP endpoint (recommended over startup training)**

Add `POST /model/train` route. This triggers `TensorflowRecommendationModel.train()` in the background and returns `202 Accepted`. The route also needs a status endpoint `GET /model/status` to poll training progress.

On server startup: call `model.load()` if a saved model exists, otherwise log that training is needed.

> Doing training at startup is simple but blocks the server for minutes. An explicit endpoint keeps startup fast.

---

### Step 7 — User recommendations use case

**File:** `src/application/use-cases/GetUserRecommendationsUseCase.ts`

```ts
class GetUserRecommendationsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly movieRepository: MovieRepository,
    private readonly recommendationModel: RecommendationModel
  ) {}

  async execute(userId: string, limit = 10): Promise<Movie[]>
}
```

Note: the existing `GetMovieRecommendationsUseCase` does *movie-to-movie* similarity using embeddings. This new use case does *user-to-movie* recommendation using the trained neural net. They are different features and should stay separate.

---

### Step 8 — HTTP route

**File:** `src/interfaces/http/routes/recommendations.ts`

Add routes:
- `GET /users/:id/recommendations` — calls `GetUserRecommendationsUseCase`
- `POST /model/train` — triggers training
- `GET /model/status` — returns training status

Wire into `app.ts` and `main/index.ts` alongside the existing movie routes.

---

## File Map

```
src/
├── scripts/
│   └── seed.ts                              ← NEW: parse CSVs, populate DB
├── ml/
│   ├── embeddings/
│   │   └── movieEmbedding.ts                ← NEW: makeContext, encodeMovie, encodeUser
│   ├── training/
│   │   ├── datasetLoader.ts                 ← NEW: createTrainingData with negative sampling
│   │   └── train.ts                         ← NEW: orchestrate end-to-end training
│   └── models/
│       └── recommendationModel.ts           ← NEW: neural net config, save/load
├── infrastructure/
│   └── ml/
│       └── TensorFlowRecommendationModel.ts ← IMPLEMENT: wire Steps 2–4
├── application/
│   └── use-cases/
│       └── GetUserRecommendationsUseCase.ts ← NEW
└── interfaces/
    └── http/
        └── routes/
            └── recommendations.ts           ← NEW: /users/:id/recommendations, /model/*
```

---

## Recommended Build Order

1. `seed.ts` — get real data into the DB first, verify with `drizzle-kit studio`
2. `movieEmbedding.ts` — test by logging a few encoded vectors
3. `datasetLoader.ts` — test by logging `xs.shape` and `ys.shape`
4. `recommendationModel.ts` — test by training on a small slice and checking loss decreases
5. `TensorFlowRecommendationModel.ts` — compose everything behind the interface
6. `GetUserRecommendationsUseCase.ts` + routes — wire into HTTP layer
7. Run `POST /model/train`, then `GET /users/:id/recommendations` and verify results make sense
