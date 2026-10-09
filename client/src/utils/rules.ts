// Vuetify validation rules. The server validates everything again.

type Rule = (value: unknown) => true | string

export const required: Rule = (v) => (typeof v === 'string' ? v.trim().length > 0 : v != null) || 'Required'

export const maxLength =
  (max: number): Rule =>
  (v) =>
    !v || String(v).length <= max || `At most ${max} characters`

export const email: Rule = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) || 'Enter a valid email address'

export const httpUrl: Rule = (v) => {
  if (!v) return true
  try {
    const url = new URL(String(v))
    return url.protocol === 'http:' || url.protocol === 'https:' || 'Use an http:// or https:// link'
  } catch {
    return 'Enter a valid link, e.g. https://…'
  }
}

export const minLength =
  (min: number): Rule =>
  (v) =>
    String(v ?? '').length >= min || `Use at least ${min} characters`

export const intBetween =
  (min: number, max: number): Rule =>
  (v) => {
    const n = Number(v)
    return (Number.isInteger(n) && n >= min && n <= max) || `Enter a whole number from ${min} to ${max}`
  }
