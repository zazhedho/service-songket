import type { ToastTone } from './newsHelpers'

export function ToastLayer({
  toast,
  onCloseToast,
}: {
  toast: { message: string; tone: ToastTone } | null
  onCloseToast: () => void
}) {
  return (
    <div className="toast-stack">
      {toast && (
        <div className={`toast-card ${toast.tone}`} role="status" aria-live="polite">
          <div className="toast-message">{toast.message}</div>
          <button className="toast-close" onClick={onCloseToast} aria-label="Close toast">x</button>
        </div>
      )}
    </div>
  )
}
