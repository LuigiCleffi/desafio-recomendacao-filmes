# Running the Application

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

## Steps

### 1. Start the database

```bash
docker compose up -d
```

This starts a Postgres 16 + pgvector container on port `5432`. The database credentials are read from `.env` — copy `.env.example` to `.env` if you haven't already.

Wait a few seconds for Postgres to be ready. You can confirm with:

```bash
docker compose ps
```

### 2. Seed the database

Migrations are already included in the repository and were applied when the schema was generated. You only need to load the data:

```bash
npm run db:seed
```

This parses `data/movies.csv` (~10k movies) and `data/movie_recommendation_users_8000.csv` (~300k ratings) and inserts them into the database. It takes about 30–60 seconds. Progress is printed inline.

> Re-running `db:seed` is safe — it truncates all tables before inserting.

### 3. Start the server

```bash
npm run dev
```

The server starts on `http://localhost:3001`. Check `GET /health` to confirm it's up.
