export function focusFirstInvalidField(fieldNames: string | string[]) {
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames]
  const escapeField =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape
      : (value: string) => value.replace(/["\\]/g, '\\$&')

  window.setTimeout(() => {
    for (const field of fields) {
      const escapedField = escapeField(field)
      const target = document.querySelector<HTMLElement>(
        [
          `[data-field="${escapedField}"] input:not([disabled])`,
          `[data-field="${escapedField}"] button:not([disabled])`,
          `[data-field="${escapedField}"] textarea:not([disabled])`,
          `[data-field="${escapedField}"] select:not([disabled])`,
          `#${escapedField}`,
          `[name="${escapedField}"]`,
        ].join(', '),
      )

      if (!target) continue
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.focus({ preventScroll: true })
      return
    }
  }, 0)
}
