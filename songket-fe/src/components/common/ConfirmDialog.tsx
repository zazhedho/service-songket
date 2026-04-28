import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ConfirmationModal from './ConfirmationModal'
import { resolveErrorMessage } from '../../utils/errorMessage'

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
type AlertContextValue = (message: unknown, options?: Omit<ConfirmOptions, 'description' | 'showCancel' | 'cancelText'>) => Promise<boolean>

type ConfirmState = ConfirmOptions & {
  open: boolean
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)
const AlertContext = createContext<AlertContextValue | null>(null)

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
    (message: unknown, options?: Omit<ConfirmOptions, 'description' | 'showCancel' | 'cancelText'>) => {
      return confirm({
        title: options?.title || 'Notice',
        description: resolveErrorMessage(message, 'Something went wrong.'),
        confirmText: options?.confirmText || 'OK',
        tone: options?.tone || 'default',
        showCancel: false,
      })
    },
    [confirm],
  )

  const value = useMemo<ConfirmContextValue>(() => confirm, [confirm])
  const alertValue = useMemo<AlertContextValue>(() => alertDialog, [alertDialog])

  return (
    <ConfirmContext.Provider value={value}>
      <AlertContext.Provider value={alertValue}>
        {children}

        <ConfirmationModal
          show={dialog.open}
          title={dialog.title || 'Confirmation'}
          message={dialog.description || 'Are you sure you want to continue?'}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          danger={dialog.tone === 'danger'}
          showCancel={dialog.showCancel}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      </AlertContext.Provider>
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

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used inside ConfirmProvider')
  }
  return context
}
