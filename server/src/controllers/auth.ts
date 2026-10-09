import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import { changePassword, verifyCredentials } from '../services/auth.js'
import { findUserById, updateDisplayName } from '../services/users.js'
import { AppError, unauthorized } from '../utils/errors.js'
import { sendItem, sendNoContent } from '../utils/respond.js'
import { changePasswordSchema, loginSchema, updateMeSchema } from '../validation/auth.js'
import { SESSION_COOKIE, sessionCookieOptions } from '../session.js'

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = loginSchema.parse(req.body)
  const user = await verifyCredentials(username, password)
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password')

  // New session id on login prevents session fixation.
  await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())))
  req.session.userId = user.id
  sendItem(res, user)
}

export async function logout(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())))
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions())
  sendNoContent(res)
}

export function me(req: Request, res: Response): void {
  const userId = req.session.userId
  const user = userId ? findUserById(userId) : undefined
  if (!user) throw unauthorized()
  sendItem(res, user)
}

export function updateMe(req: Request, res: Response): void {
  const { displayName } = updateMeSchema.parse(req.body)
  sendItem(res, updateDisplayName(currentUser(req).id, displayName))
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)
  await changePassword(currentUser(req).id, currentPassword, newPassword)
  sendNoContent(res)
}
