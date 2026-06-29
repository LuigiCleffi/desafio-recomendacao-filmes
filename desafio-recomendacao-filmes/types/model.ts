export interface ModelStatus {
  status: 'idle' | 'training' | 'ready' | 'error'
  modelReady: boolean
}

export interface TrainingLog {
  epoch: number
  loss: number
  acc?: number
  valLoss?: number
  valAcc?: number
}
