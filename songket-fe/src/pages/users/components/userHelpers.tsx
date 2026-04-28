export function detailValue(value: unknown) {
  if (value == null || value === '') return '-'
  return String(value)
}

export function normalizeKey(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

export function sanitizeIdList(ids: string[]) {
  return Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)))
}

export function roleLabel(value: string) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function roleNames(items: Array<{ name?: string }> | unknown) {
  if (!Array.isArray(items)) return []

  return Array.from(
    new Set(
      items
        .map((item) => String(item?.name || '').trim())
        .filter(Boolean),
    ),
  )
}

export function validatePasswordByBackendRule(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (password.length > 64) return 'Password must be at most 64 characters long.'
  if (!/[a-z]/.test(password)) return 'Password must include at least 1 lowercase letter (a-z).'
  if (!/[A-Z]/.test(password)) return 'Password must include at least 1 uppercase letter (A-Z).'
  if (!/[0-9]/.test(password)) return 'Password must include at least 1 number (0-9).'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must include at least 1 symbol (!@#$%^&*...).'
  return ''
}

export function getPasswordRuleChecks(password: string) {
  return [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Maximum 64 characters', valid: password.length <= 64 },
    { label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least 1 number (0-9)', valid: /[0-9]/.test(password) },
    { label: 'At least 1 symbol (!@#$%^&*...)', valid: /[^a-zA-Z0-9]/.test(password) },
  ]
}

export function formatDateTime(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-US')
}

export function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10.6 6.2A11.6 11.6 0 0 1 12 6c6.5 0 10 6 10 6a18.8 18.8 0 0 1-3.1 3.7M6.1 9.1A18.4 18.4 0 0 0 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function PasswordRulesGuide({ password }: { password: string }) {
  if (!password) return null
  const checks = getPasswordRuleChecks(password)
  return (
    <div className="profile-password-rules user-password-rules">
      <div className="profile-password-rules-title">Password Requirements:</div>
      {checks.map((rule) => (
        <div key={rule.label} className={`profile-password-rule ${rule.valid ? 'valid' : 'invalid'}`}>
          <span className="profile-password-rule-icon" aria-hidden="true">
            {rule.valid ? '✓' : '×'}
          </span>
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  )
}
