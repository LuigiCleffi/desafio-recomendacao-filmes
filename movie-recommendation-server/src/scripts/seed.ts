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
  const userRows = uniqueExternalUserIds.map((externalId) => ({ externalId }))
  await insertInBatches(users, userRows, 'users')

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
