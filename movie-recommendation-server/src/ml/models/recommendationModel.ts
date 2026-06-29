import * as tf from '@tensorflow/tfjs-node'

export async function configureNeuralNetAndTrain(
  trainData: { xs: tf.Tensor2D; ys: tf.Tensor2D; inputDim: number },
  onEpochEnd?: (epoch: number, logs: tf.Logs) => void,
): Promise<tf.LayersModel> {
  const model = tf.sequential()

  model.add(tf.layers.dense({
    inputShape: [trainData.inputDim],
    units: 128,
    activation: 'relu',
  }))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  })

  await model.fit(trainData.xs, trainData.ys, {
    epochs: 100,
    batchSize: 32,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (logs) onEpochEnd?.(epoch, logs)
        // Yield the event loop so Node.js can flush SSE writes to the browser
        await new Promise<void>(resolve => setImmediate(resolve))
      },
    },
  })

  return model
}

export async function saveModel(model: tf.LayersModel, path: string): Promise<void> {
  await model.save(`file://${path}`)
}

export async function loadModel(path: string): Promise<tf.LayersModel> {
  return tf.loadLayersModel(`file://${path}/model.json`)
}
