import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

type ToastOptions = {
  tone?: ToastTone
  durationMs?: number
}

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastContextValue = (message: string, options?: ToastOptions) => void

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextIdRef = useRef(1)

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = nextIdRef.current
    nextIdRef.current += 1

    const tone = options?.tone || 'info'
    const durationMs = options?.durationMs ?? 2800

    setToasts((prev) => [...prev, { id, message, tone }])

    if (durationMs > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id))
      }, durationMs)
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => showToast, [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card ${toast.tone}`} role="status" aria-live="polite">
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Close toast">
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context
}
