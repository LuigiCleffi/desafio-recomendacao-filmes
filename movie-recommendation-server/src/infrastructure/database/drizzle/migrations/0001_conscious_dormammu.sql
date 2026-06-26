CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "movies" ADD COLUMN "embedding" vector(512);

CREATE INDEX ON movies USING hnsw (embedding vector_cosine_ops);
