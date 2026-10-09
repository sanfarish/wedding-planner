import type { ApiErrorBody } from '@wedding/shared'

export type FieldErrors = Record<string, string[] | undefined>

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** Per-field validation messages from the server, if any. */
  get fieldErrors(): FieldErrors {
    return (this.details?.fieldErrors as FieldErrors | undefined) ?? {}
  }
}

/** Friendly message for any thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) return err.message
  return fallback
}

type Query = Record<string, string | number | boolean | null | undefined>

let unauthorizedHandler: (() => void) | null = null

/** Called when an authenticated request returns 401 (e.g. the session expired). */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler
}

function toQueryString(query?: Query): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(path + toQueryString(query), {
      method,
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.")
  }

  if (res.status === 204) return undefined as T

  const json = (await res.json().catch(() => null)) as unknown

  if (!res.ok) {
    const error = (json as ApiErrorBody | null)?.error
    if (res.status === 401 && path !== '/api/auth/login') unauthorizedHandler?.()
    throw new ApiError(
      res.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed (${res.status})`,
      error?.details,
    )
  }

  return json as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}
