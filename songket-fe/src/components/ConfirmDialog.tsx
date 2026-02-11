import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ConfirmTone = 'default' | 'danger'

type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  tone?: ConfirmTone
  showCancel?: boolean
}

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>

type ConfirmState = ConfirmOptions & {
  open: boolean
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

const defaultState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  tone: 'default',
  showCancel: true,
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmState>(defaultState)
  const resolverRef = useRef<((result: boolean) => void) | null>(null)

  const close = useCallback((result: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
    setDialog(defaultState)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setDialog({
        open: true,
        title: options.title || 'Confirmation',
        description: options.description || 'Are you sure you want to continue?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        tone: options.tone || 'default',
        showCancel: options.showCancel ?? true,
      })
    })
  }, [])

  const alertDialog = useCallback(
    (message: string, options?: Omit<ConfirmOptions, 'description' | 'showCancel' | 'cancelText'>) => {
      return confirm({
        title: options?.title || 'Notice',
        description: message,
        confirmText: options?.confirmText || 'OK',
        tone: options?.tone || 'default',
        showCancel: false,
      })
    },
    [confirm],
  )

  useEffect(() => {
    const nativeAlert = window.alert.bind(window)
    window.alert = (message?: any) => {
      void alertDialog(String(message ?? ''))
    }
    return () => {
      window.alert = nativeAlert
    }
  }, [alertDialog])

  const value = useMemo<ConfirmContextValue>(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {dialog.open && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Confirmation">
          <div className="confirm-toast">
            <div className="confirm-title">{dialog.title}</div>
            <div className="confirm-description">{dialog.description}</div>
            <div className="confirm-actions">
              {dialog.showCancel && (
                <button className="btn-ghost" type="button" onClick={() => close(false)}>
                  {dialog.cancelText}
                </button>
              )}
              <button
                className={`btn ${dialog.tone === 'danger' ? 'confirm-danger' : ''}`}
                type="button"
                onClick={() => close(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used inside ConfirmProvider')
  }
  return context
}
