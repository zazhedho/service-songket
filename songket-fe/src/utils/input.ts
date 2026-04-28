export function sanitizeDigits(value: string) {
  return String(value || '').replace(/\D+/g, '')
}

export function sanitizeSignedDecimal(value: string) {
  const raw = String(value || '')
  let out = ''
  let hasDot = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]

    if (char >= '0' && char <= '9') {
      out += char
      continue
    }

    if (char === '.' && !hasDot) {
      out += char
      hasDot = true
      continue
    }

    if (char === '-' && out.length === 0) {
      out += char
    }
  }

  return out
}
