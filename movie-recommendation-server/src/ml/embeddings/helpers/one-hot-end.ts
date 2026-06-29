import * as tf from '@tensorflow/tfjs-node'

// For single-value categorical features (e.g. content rating, primary language).
// Not currently used — genres are multi-hot — but available for future scalar features.
export const oneHotWeighted = (index: number, length: number, weight: number): tf.Tensor1D =>
  tf.oneHot(index, length).cast('float32').mul(weight) as tf.Tensor1D
