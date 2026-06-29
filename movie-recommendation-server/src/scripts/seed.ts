import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { db } from '../infrastructure/database/drizzle/client.js'
import { movies, users, ratings } from '../infrastructure/database/drizzle/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const BATCH_SIZE = 500

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

function extractYear(title: string): number | null {
  const match = title.match(/\((\d{4})\)\s*$/)
  return match ? parseInt(match[1]!, 10) : null
}

// Deterministic birth year derived from externalId.
// Distribution: 1945–2000 (users were 16–55 when ratings peaked around 2000–2015).
// LCG hash gives good spread without external dependencies.
function deriveBirthYear(externalId: number): number {
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  let state = externalId
  state = ((a * state + c) >>> 0) % m
  state = ((a * state + c) >>> 0) % m
  return 1945 + (state % 56) // 1945–2000
}

// Synthetic younger users born 2001–2012 (Gen Z / late Millennials).
// Uses a separate LCG seed offset so distribution is independent of the CSV users.
function deriveSyntheticBirthYear(index: number): number {
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  let state = index ^ 0xdeadbeef // XOR to separate from deriveBirthYear seeds
  state = ((a * state + c) >>> 0) % m
  state = ((a * state + c) >>> 0) % m
  return 2001 + (state % 12) // 2001–2012
}

const SYNTHETIC_USER_COUNT = 2000
// Offset well above any real external user ID in the ratings CSV
const SYNTHETIC_ID_OFFSET = 100_001

async function insertInBatches<T extends object>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  label: string,
) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(table).values(rows.slice(i, i + BATCH_SIZE) as any).onConflictDoNothing()
    inserted += Math.min(BATCH_SIZE, rows.length - i)
    process.stdout.write(`\r  ${label}: ${inserted}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function seed() {
  console.log('Truncating existing data...')
  await db.execute(sql`TRUNCATE TABLE movies, users CASCADE`)

  // ── Movies ────────────────────────────────────────────────────────────────
  console.log('Parsing movies.csv...')
  const moviesCSV = readFileSync(resolve(DATA_DIR, 'movies.csv'), 'utf-8')
  const movieRows = moviesCSV
    .split('\n')
    .slice(1) // skip header
    .filter(Boolean)
    .map((line) => {
      const [movieIdStr, title, genres] = parseCSVLine(line)
      return {
        externalId: parseInt(movieIdStr!, 10),
        title: title!,
        genre: genres ?? null,
        releaseYear: extractYear(title!),
        description: null,
      }
    })

  await insertInBatches(movies, movieRows, 'movies')

  // ── Ratings CSV ───────────────────────────────────────────────────────────
  console.log('Parsing ratings CSV...')
  const ratingsCSV = readFileSync(
    resolve(DATA_DIR, 'movie_recommendation_users_8000.csv'),
    'utf-8',
  )
  const ratingData = ratingsCSV
    .split('\n')
    .slice(1) // skip header
    .filter(Boolean)
    .map((line) => {
      const [userIdStr, movieIdStr, ratingStr] = line.split(',')
      return {
        externalUserId: parseInt(userIdStr!, 10),
        externalMovieId: parseInt(movieIdStr!, 10),
        rating: parseFloat(ratingStr!),
      }
    })

  // ── Users ─────────────────────────────────────────────────────────────────
  const uniqueExternalUserIds = [...new Set(ratingData.map((r) => r.externalUserId))]
  console.log(`Found ${uniqueExternalUserIds.length} unique users.`)
  const userRows = uniqueExternalUserIds.map((externalId) => ({
    externalId,
    birthYear: deriveBirthYear(externalId),
  }))
  await insertInBatches(users, userRows, 'users')

  // Add synthetic younger users (born 2001–2012) with no ratings — for cold-start testing
  console.log(`Adding ${SYNTHETIC_USER_COUNT} synthetic Gen-Z users (born 2001–2012)...`)
  const syntheticUserRows = Array.from({ length: SYNTHETIC_USER_COUNT }, (_, i) => ({
    externalId: SYNTHETIC_ID_OFFSET + i,
    birthYear: deriveSyntheticBirthYear(SYNTHETIC_ID_OFFSET + i),
  }))
  await insertInBatches(users, syntheticUserRows, 'synthetic users')

  // ── Build lookup maps ─────────────────────────────────────────────────────
  console.log('Building ID maps...')
  const [movieIdRows, userIdRows] = await Promise.all([
    db.select({ id: movies.id, externalId: movies.externalId }).from(movies),
    db.select({ id: users.id, externalId: users.externalId }).from(users),
  ])
  const movieIdMap = new Map(movieIdRows.map((m) => [m.externalId, m.id]))
  const userIdMap = new Map(userIdRows.map((u) => [u.externalId, u.id]))

  // ── Ratings ───────────────────────────────────────────────────────────────
  const ratingRows = ratingData
    .map((r) => ({
      userId: userIdMap.get(r.externalUserId),
      movieId: movieIdMap.get(r.externalMovieId),
      rating: r.rating,
    }))
    .filter((r): r is { userId: string; movieId: string; rating: number } =>
      r.userId !== undefined && r.movieId !== undefined,
    )

  const skipped = ratingData.length - ratingRows.length
  if (skipped > 0) console.log(`  Skipped ${skipped} ratings (movie not in catalogue).`)

  await insertInBatches(ratings, ratingRows, 'ratings')

  console.log('Seed complete.')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
