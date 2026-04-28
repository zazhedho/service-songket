import { useEffect, useMemo, useRef, useState } from 'react'

export type ActionMenuItem = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  hidden?: boolean
}

type ActionMenuProps = {
  items: ActionMenuItem[]
  label?: string
  emptyLabel?: string
}

export default function ActionMenu({ items, label = 'Options', emptyLabel = '-' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const visibleItems = useMemo(() => items.filter((item) => !item.hidden), [items])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (visibleItems.length === 0) {
    return <span className="action-menu-empty">{emptyLabel}</span>
  }

  return (
    <div className="action-menu" ref={rootRef}>
      <button
        type="button"
        className="btn-ghost action-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="action-menu-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" focusable="false">
            <circle cx="10" cy="4" r="1.8" />
            <circle cx="10" cy="10" r="1.8" />
            <circle cx="10" cy="16" r="1.8" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="action-menu-dropdown" role="menu">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`action-menu-item${item.danger ? ' danger' : ''}`}
              onClick={() => {
                if (item.disabled) return
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
