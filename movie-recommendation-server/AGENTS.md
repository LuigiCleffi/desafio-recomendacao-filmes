# Movie Recommendation Server — Architecture Guide

## Project Structure

```
Project
│
├── docker-compose.yml
├── Dockerfile
├── .env
│
└── src
    │
    ├── domain
    │   ├── entities
    │   └── repositories
    │
    ├── application
    │   └── use-cases
    │
    ├── infrastructure
    │   ├── database
    │   │   └── drizzle
    │   │       ├── client.ts
    │   │       ├── schema.ts
    │   │       └── migrations
    │   └── repositories
    │
    ├── interfaces
    │   └── http
    │       └── routes
    │
    └── main
```

## Layer Responsibilities

### domain
Pure business logic. No framework, no database, no HTTP. Contains:
- Entities (e.g. `Movie`)
- Repository interfaces (e.g. `MovieRepository`)

This layer never imports from `infrastructure`, `interfaces`, or `main`.

### application
Orchestrates domain objects to fulfill use cases. No framework, no database. Contains:
- Use cases (e.g. `GetMovieRecommendationsUseCase`)

Depends only on `domain`.

### infrastructure
All external concerns: database, third-party services. Contains:
- Drizzle client and schema
- Repository implementations (e.g. `DrizzleMovieRepository`)

The only layer that knows about PostgreSQL, Drizzle, Docker.

### interfaces
HTTP layer. Contains:
- Fastify route handlers
- Request/response schemas (Fastify + TypeBox)

Calls application use cases, never domain or infrastructure directly.

### main
Composition root. Wires everything together:
- Instantiates infrastructure adapters
- Injects into use cases
- Registers Fastify plugins and routes
- Starts the server

---

## Runtime Stack

```
Docker PostgreSQL
        |
    Drizzle ORM
        |
  Repository Adapter
        |
 Application Use Cases
        |
    Fastify API
```

---

## Database Infrastructure

### docker-compose.yml

Create `docker-compose.yml` at the project root.

Requirements:
- PostgreSQL container (postgres:16-alpine)
- Persistent named volume
- Environment variables from `.env`
- Expose PostgreSQL on port 5432
- Health check configuration

Example:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Environment variables

Create `.env` at the project root with:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}
```

The application connects exclusively via `DATABASE_URL`.

---

### infrastructure/database/drizzle/client.ts

Responsibilities:
- Load `DATABASE_URL` from environment
- Create the PostgreSQL connection using `postgres` driver
- Initialize and export the Drizzle ORM instance

Only this file knows about:
- The `postgres` driver
- The Drizzle connection setup
- Database configuration

No other file imports the raw `postgres` client.

---

### infrastructure/database/drizzle/schema.ts

Define the database schema using Drizzle's schema builder.

**movies table:**

| Column       | Type      | Constraints              |
|-------------|-----------|--------------------------|
| id          | uuid      | primary key, default     |
| title       | varchar   | not null                 |
| description | text      | nullable                 |
| release_year | integer  | nullable                 |
| genre       | varchar   | nullable                 |
| created_at  | timestamp | default now()            |
| updated_at  | timestamp | default now()            |

---

### Drizzle scripts

Add to `package.json`:

```json
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

Migrations live in `src/infrastructure/database/drizzle/migrations/`.

---

## Dockerfile

Requirements:
- Node.js runtime (node:22-alpine)
- Install production dependencies
- Build TypeScript
- Run the compiled production server

---

## Dependency Inversion

The dependency flow always points inward:

```
PostgreSQL
    |
Drizzle schema
    |
DrizzleMovieRepository   ← implements →   MovieRepository (domain interface)
    |
Use Cases
    |
Movie (entity)
```

Replacing the database requires only:
1. Create a new repository implementation (e.g. `MongoMovieRepository`)
2. Update the composition root in `main` to inject the new implementation

Everything above `infrastructure` remains untouched.

Example swap:

```ts
// Before
const movieRepository = new DrizzleMovieRepository(db)

// After
const movieRepository = new MongoMovieRepository(mongoClient)

// Use case stays the same — it only sees MovieRepository interface
const useCase = new GetMovieRecommendationsUseCase(movieRepository)
```

---

## Fastify API

Use Fastify with TypeBox schemas for request validation and response serialization. See the `fastify-best-practices` skill (`.claude/skills/fastify/SKILL.md`) for patterns on plugins, routes, hooks, and error handling.

The HTTP layer only calls application use cases — it never reaches into domain entities or infrastructure directly.
