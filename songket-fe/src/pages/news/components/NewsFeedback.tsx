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

export function DeleteConfirmDialog({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!visible) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Konfirmasi hapus berita">
      <div className="modal" style={{ width: 'min(420px, 100%)' }}>
        <h3 style={{ marginBottom: 8 }}>Konfirmasi Hapus</h3>
        <div className="muted" style={{ marginBottom: 14 }}>Hapus berita ini?</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn" onClick={onConfirm}>Hapus</button>
        </div>
      </div>
    </div>
  )
}
