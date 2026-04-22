import { useEffect, useMemo, useRef, useState } from 'react'

type SearchableSelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  id?: string
  value: string
  options: SearchableSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
}

export default function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  disabled = false,
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, search])

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length)
  }, [filteredOptions.length])

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1)
      return
    }

    const selectedIndex = filteredOptions.findIndex((option) => option.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : filteredOptions.length > 0 ? 0 : -1)
  }, [filteredOptions, open, value])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) {
      setSearch('')
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 0)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className={`searchable-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="searchable-select-trigger"
        onClick={() => {
          if (disabled) return
          setOpen((prev) => !prev)
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`searchable-select-value${selectedOption ? '' : ' placeholder'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="searchable-select-caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="searchable-select-popover">
          <div className="searchable-select-search">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  if (filteredOptions.length === 0) return
                  setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
                  return
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  if (filteredOptions.length === 0) return
                  setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
                  return
                }

                if (event.key === 'Enter') {
                  if (activeIndex < 0 || activeIndex >= filteredOptions.length) return
                  event.preventDefault()
                  onChange(filteredOptions[activeIndex].value)
                  setOpen(false)
                  triggerRef.current?.focus()
                  return
                }

                if (event.key === 'Escape') {
                  event.preventDefault()
                  setOpen(false)
                  triggerRef.current?.focus()
                }
              }}
            />
          </div>

          <div className="searchable-select-options" role="listbox" aria-labelledby={id}>
            {filteredOptions.length === 0 && (
              <div className="searchable-select-empty">{emptyMessage}</div>
            )}

            {filteredOptions.map((option, index) => {
              const active = option.value === value
              const highlighted = index === activeIndex
              return (
                <button
                  key={option.value || '__empty__'}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  className={`searchable-select-option${active ? ' active' : ''}${highlighted ? ' highlighted' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                  role="option"
                  aria-selected={active}
                >
                  <span>{option.label}</span>
                  {active && <span className="searchable-select-check">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
