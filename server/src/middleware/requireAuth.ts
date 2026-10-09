import type { NextFunction, Request, Response } from 'express'
import type { User } from '@wedding/shared'
import { findUserById } from '../services/users.js'
import { unauthorized } from '../utils/errors.js'

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.session.userId
  const user = userId ? findUserById(userId) : undefined
  if (!user) return next(unauthorized())
  req.user = user
  next()
}

/** The authenticated user. Only valid behind requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized()
  return req.user
}
