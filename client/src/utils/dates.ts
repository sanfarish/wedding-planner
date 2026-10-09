const LOCALE = 'en-GB'

/** Today as YYYY-MM-DD in the browser's timezone. */
export function today(): string {
  const d = new Date()
  return toDateString(d)
}

export function toDateString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Parses YYYY-MM-DD as a local calendar date (no timezone shift). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** "12 Oct 2026" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  return parseDate(value).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "Saturday, 10 January 2027" */
export function formatLongDate(value: string | null | undefined): string {
  if (!value) return ''
  return parseDate(value).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "12 Oct" (adds the year only when it differs from this year) */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = parseDate(value)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

/** "Today", "Tomorrow", "Yesterday", or a short date. */
export function formatDueDate(value: string | null | undefined): string {
  if (!value) return ''
  const diff = daysFromToday(value)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatShortDate(value)
}

export function daysFromToday(value: string): number {
  return Math.round((parseDate(value).getTime() - parseDate(today()).getTime()) / 86_400_000)
}

export function isOverdue(dueDate: string | null | undefined, done: boolean): boolean {
  return !done && !!dueDate && dueDate < today()
}

/** "October 2026" */
export function formatMonth(value: string): string {
  return parseDate(value).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

/** Time of an ISO timestamp, e.g. "14:32" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

/** "2 hours ago" */
export function relativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86_400 * 7) return rtf.format(Math.round(seconds / 86_400), 'day')
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Local calendar date (YYYY-MM-DD) of an ISO timestamp. */
export function localDateOf(iso: string): string {
  return toDateString(new Date(iso))
}
