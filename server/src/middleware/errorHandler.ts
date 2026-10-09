import type { NextFunction, Request, Response } from 'express'
import { z, ZodError } from 'zod'
import { config } from '../config.js'
import { AppError } from '../utils/errors.js'

interface ErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`))
}

// Express recognises error handlers by their 4-argument signature.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const { status, body } = toResponse(err)

  if (status >= 500) console.error(err)

  res.status(status).json({ error: body })
}

function toResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    }
  }

  if (err instanceof ZodError) {
    const { formErrors, fieldErrors } = z.flattenError(err)
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { formErrors, fieldErrors } },
    }
  }

  if (isSqliteError(err)) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { status: 409, body: { code: 'CONFLICT', message: 'That name is already in use' } }
    }
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return { status: 409, body: { code: 'CONFLICT', message: 'This item is still referenced by other records' } }
    }
  }

  // body-parser errors (invalid JSON, payload too large) carry a status and type.
  if (isHttpError(err) && err.status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message
    return { status: err.status, body: { code: 'BAD_REQUEST', message } }
  }

  return {
    status: 500,
    body: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      ...(!config.isProduction && err instanceof Error ? { details: { error: err.message } } : {}),
    },
  }
}

function isHttpError(err: unknown): err is { status: number; type?: string; message: string } {
  return typeof err === 'object' && err !== null && typeof (err as { status?: unknown }).status === 'number'
}

function isSqliteError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && err.name === 'SqliteError' && typeof (err as { code?: unknown }).code === 'string'
}
