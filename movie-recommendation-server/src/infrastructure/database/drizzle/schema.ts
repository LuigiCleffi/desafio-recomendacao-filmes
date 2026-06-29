import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  integer, 
  timestamp, 
  vector,
  real
} from 'drizzle-orm/pg-core'


export const movies = pgTable('movies', {
  id: uuid('id').primaryKey().defaultRandom(),

  externalId: integer('external_id').notNull().unique(),

  title: varchar('title', { length: 255 }).notNull(),

  description: text('description'),

  releaseYear: integer('release_year'),

  genre: varchar('genre', { length: 255 }),

  embedding: vector('embedding', {
    dimensions: 22
  }),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull(),
})


export type MovieRow = typeof movies.$inferSelect
export type NewMovieRow = typeof movies.$inferInsert

export const users = pgTable('users', {

  id: uuid('id')
    .primaryKey()
    .defaultRandom(),

  externalId: integer('external_id')
    .notNull()
    .unique(),

  birthYear: integer('birth_year')
    .notNull(),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

})


export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert



export const ratings = pgTable('ratings', {

  id: uuid('id')
    .primaryKey()
    .defaultRandom(),

  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),

  movieId: uuid('movie_id')
    .references(() => movies.id)
    .notNull(),

  rating: real('rating')
    .notNull(),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

})


export type RatingRow = typeof ratings.$inferSelect
export type NewRatingRow = typeof ratings.$inferInsert




export const movieRecommendations = pgTable(
  'movie_recommendations',
{

  id: uuid('id')
    .primaryKey()
    .defaultRandom(),

  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),

  movieId: uuid('movie_id')
    .references(() => movies.id)
    .notNull(),

  score: real('score')
    .notNull(),

  modelVersion: varchar(
    'model_version',
    { length: 50 }
  ),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

})


export type MovieRecommendationRow =
  typeof movieRecommendations.$inferSelect


export type NewMovieRecommendationRow =
  typeof movieRecommendations.$inferInsert