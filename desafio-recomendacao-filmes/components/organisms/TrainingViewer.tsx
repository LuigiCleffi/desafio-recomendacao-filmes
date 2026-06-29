'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Cpu, Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useModelStatus } from '@/hooks/useModel'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const TOTAL_EPOCHS = 100

type TrainingPhase = 'idle' | 'training' | 'done' | 'error'

interface EpochLog {
  epoch: number
  loss: number
  acc: number | null
}

interface TrainingViewerProps {
  onClose: () => void
}

export function TrainingViewer({ onClose }: TrainingViewerProps) {
  const { data: status, refetch: refetchStatus } = useModelStatus()

  const [phase, setPhase] = useState<TrainingPhase>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [currentLoss, setCurrentLoss] = useState<number | null>(null)
  const [currentAcc, setCurrentAcc] = useState<number | null>(null)
  const [finalAcc, setFinalAcc] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [epochLogs, setEpochLogs] = useState<EpochLog[]>([])

  const logEndRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [epochLogs])

  useEffect(() => {
    return () => {
      esRef.current?.close()
    }
  }, [])

  const startTraining = useCallback(() => {
    if (phase === 'training') return

    setPhase('training')
    setStatusMessage('Connecting...')
    setCurrentEpoch(0)
    setCurrentLoss(null)
    setCurrentAcc(null)
    setFinalAcc(null)
    setErrorMsg('')
    setEpochLogs([])

    const es = new EventSource(`${API_BASE}/model/train/stream`)
    esRef.current = es

    es.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as Record<string, unknown>

      if (msg.type === 'already_training') {
        setStatusMessage('Training already running on server — restart the modal once it finishes.')
        es.close()
        return
      } else if (msg.type === 'status') {
        setStatusMessage(msg.message as string)
      } else if (msg.type === 'epoch') {
        const epoch = msg.epoch as number
        const loss = msg.loss as number
        const acc = (msg.acc as number | null) ?? null
        setCurrentEpoch(epoch)
        setCurrentLoss(loss)
        setCurrentAcc(acc)
        setEpochLogs(prev => [...prev, { epoch, loss, acc }])
      } else if (msg.type === 'done') {
        setPhase('done')
        setFinalAcc((msg.accuracy as number | null) ?? null)
        es.close()
        refetchStatus()
      } else if (msg.type === 'error') {
        setPhase('error')
        setErrorMsg(msg.message as string)
        es.close()
      }
    }

    es.onerror = () => {
      setPhase('error')
      setErrorMsg('Connection to server lost.')
      es.close()
    }
  }, [phase, refetchStatus])

  const progress = TOTAL_EPOCHS > 0 ? (currentEpoch / TOTAL_EPOCHS) * 100 : 0
  const isTraining = phase === 'training'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-white">Model Training</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isTraining}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Status cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Model</p>
              <p className={`text-sm font-semibold ${status?.modelReady ? 'text-green-400' : 'text-muted-foreground'}`}>
                {status?.modelReady ? 'Ready' : 'Untrained'}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isTraining ? 'Epoch' : 'Loss'}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                {isTraining
                  ? `${currentEpoch} / ${TOTAL_EPOCHS}`
                  : currentLoss != null
                    ? currentLoss.toFixed(4)
                    : '—'}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
              <p className={`text-sm font-semibold ${phase === 'done' ? 'text-green-400' : 'text-muted-foreground'}`}>
                {phase === 'done' && finalAcc != null
                  ? `${(finalAcc * 100).toFixed(1)}%`
                  : currentAcc != null
                    ? `${(currentAcc * 100).toFixed(1)}%`
                    : '—'}
              </p>
            </div>
          </div>

          {/* Progress bar — only shown during / after training */}
          {(isTraining || phase === 'done') && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{statusMessage || 'Training...'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${phase === 'done' ? 100 : progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Done / error banners */}
          {phase === 'done' && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Training complete! Model is now live.
              {finalAcc != null && ` Final accuracy: ${(finalAcc * 100).toFixed(1)}%`}
            </div>
          )}
          {phase === 'error' && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg || 'An error occurred during training.'}</span>
            </div>
          )}

          {/* Epoch log — scrollable */}
          {epochLogs.length > 0 && (
            <div className="bg-muted/40 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Epoch Log</p>
              </div>
              <div className="max-h-48 overflow-y-auto font-mono text-xs">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="text-muted-foreground">
                      <th className="text-left px-3 py-1.5">Epoch</th>
                      <th className="text-right px-3 py-1.5">Loss</th>
                      <th className="text-right px-3 py-1.5">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {epochLogs.map(log => (
                      <tr key={log.epoch} className="border-t border-border/30 hover:bg-muted/60">
                        <td className="px-3 py-1 text-muted-foreground">{log.epoch}</td>
                        <td className="px-3 py-1 text-right text-amber-400">{log.loss.toFixed(4)}</td>
                        <td className="px-3 py-1 text-right text-blue-400">
                          {log.acc != null ? `${(log.acc * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {/* Idle instructions */}
          {phase === 'idle' && epochLogs.length === 0 && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium mb-1">Prerequisites</p>
              <p>1. Server running: <code className="text-primary">npm run dev</code></p>
              <p>2. Data seeded: <code className="text-primary">npm run db:seed</code></p>
              <p>3. Embeddings generated: <code className="text-primary">npm run ml:embeddings</code></p>
              <p>4. Click Start Training — epoch metrics will stream here in real time.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <Button
            className="w-full"
            onClick={startTraining}
            disabled={isTraining}
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Training — epoch {currentEpoch} / {TOTAL_EPOCHS}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {phase === 'done' || phase === 'error' ? 'Retrain' : 'Start Training'}
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}
