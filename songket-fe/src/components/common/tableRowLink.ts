import type { HTMLAttributes } from 'react'

type ClickableTableRowOptions = {
  ariaLabel?: string
  className?: string
}

const BASE_INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[data-row-click-ignore="true"]',
].join(', ')

const ROW_INTERACTIVE_SELECTOR = [
  BASE_INTERACTIVE_SELECTOR,
  '[data-cell-clickable="true"]',
].join(', ')

function shouldIgnoreActivation(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
  selector: string,
): boolean {
  if (!(target instanceof Element)) return false
  const closestMatch = target.closest(selector)
  if (!closestMatch) return false
  return closestMatch !== currentTarget
}

export function getClickableTableRowProps(
  onActivate: () => void,
  options: ClickableTableRowOptions = {},
): HTMLAttributes<HTMLTableRowElement> {
  const className = ['table-row-clickable', options.className].filter(Boolean).join(' ')

  return {
    className,
    role: 'link',
    tabIndex: 0,
    'aria-label': options.ariaLabel,
    onClick: (event) => {
      if (shouldIgnoreActivation(event.target, event.currentTarget, ROW_INTERACTIVE_SELECTOR)) return
      onActivate()
    },
    onKeyDown: (event) => {
      if (shouldIgnoreActivation(event.target, event.currentTarget, ROW_INTERACTIVE_SELECTOR)) return
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onActivate()
    },
  }
}

export function getClickableTableCellProps(
  onActivate: () => void,
  options: ClickableTableRowOptions = {},
): HTMLAttributes<HTMLTableCellElement> {
  const className = ['table-cell-clickable', options.className].filter(Boolean).join(' ')

  return {
    className,
    tabIndex: 0,
    'data-cell-clickable': 'true',
    'aria-label': options.ariaLabel,
    onClick: (event) => {
      if (shouldIgnoreActivation(event.target, event.currentTarget, BASE_INTERACTIVE_SELECTOR)) return
      event.stopPropagation()
      onActivate()
    },
    onKeyDown: (event) => {
      if (shouldIgnoreActivation(event.target, event.currentTarget, BASE_INTERACTIVE_SELECTOR)) return
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      onActivate()
    },
  }
}
