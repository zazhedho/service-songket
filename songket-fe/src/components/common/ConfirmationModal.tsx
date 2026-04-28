type ConfirmationModalProps = {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  showCancel?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationModal({
  show,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  showCancel = true,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!show) return null

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-toast">
        <div className="confirm-title">{title}</div>
        <div className="confirm-description">{message}</div>
        <div className="confirm-actions">
          {showCancel && (
            <button className="btn-ghost" type="button" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className={`btn ${danger ? 'confirm-danger' : ''}`} type="button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
