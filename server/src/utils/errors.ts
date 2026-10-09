export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(what = 'Resource'): AppError {
  return new AppError(404, 'NOT_FOUND', `${what} not found`)
}

export function badRequest(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(400, 'VALIDATION_ERROR', message, details)
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message)
}

export function conflict(message: string): AppError {
  return new AppError(409, 'CONFLICT', message)
}
