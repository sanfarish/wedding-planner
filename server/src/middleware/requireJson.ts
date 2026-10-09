import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.js'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Mutating requests that carry a body must be JSON. Browsers cannot send
 * cross-site JSON without a CORS preflight, which adds CSRF protection on top
 * of SameSite=Lax cookies.
 */
export function requireJson(req: Request, _res: Response, next: NextFunction): void {
  // req.is() returns null when the request has no body.
  if (MUTATING.has(req.method) && req.is('application/json') === false) {
    return next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must use Content-Type: application/json'))
  }
  next()
}
