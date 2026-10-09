import type { Response } from 'express'

export function sendItem<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data })
}

export function sendList<T>(res: Response, data: T[], total: number, meta: Record<string, unknown> = {}): void {
  res.json({ data, meta: { total, ...meta } })
}

export function sendNoContent(res: Response): void {
  res.status(204).end()
}
