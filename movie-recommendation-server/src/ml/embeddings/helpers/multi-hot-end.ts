import * as tf from '@tensorflow/tfjs-node'
// For multi-value categorical features where multiple slots can be active at once.
// Each active index is set to `weight`; all others remain 0.
export const createMultiHotWeighted = (indices: number[], numClasses: number, weight: number): tf.Tensor1D => {
  if (indices.length === 0) return tf.zeros([numClasses])

  // tf.scalar produces a 0-D tensor → tf.oneHot gives shape [numClasses]
  // tf.tensor1d([i]) would give shape [1] → tf.oneHot gives [1, numClasses] which breaks concat
  const oneHotTensors = indices.map(i => tf.oneHot(tf.scalar(i, 'int32'), numClasses))
  const stacked = tf.stack(oneHotTensors)
  const multiHot = tf.clipByValue(stacked.sum(0), 0, 1).cast('float32').mul(weight)

  tf.dispose(oneHotTensors)
  tf.dispose(stacked)

  return multiHot as tf.Tensor1D
}