// Exported so userEmbedding can normalize the birth year fallback consistently
export const normalize = (value: number, min: number, max: number) =>
  (value - min) / (max - min || 1)
