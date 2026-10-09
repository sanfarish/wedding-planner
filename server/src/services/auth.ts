import argon2 from 'argon2'
import type { User } from '@wedding/shared'
import { badRequest } from '../utils/errors.js'
import { findUserWithHash, getPasswordHash, insertUser, updatePasswordHash, countUsers, MAX_USERS } from './users.js'

const HASH_OPTIONS = { type: argon2.argon2id } as const

let dummyHash: Promise<string> | null = null

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, HASH_OPTIONS)
}

/**
 * Returns the user when the credentials are valid, otherwise null.
 * Unknown usernames still run a verification against a dummy hash so that
 * response timing does not reveal which usernames exist.
 */
export async function verifyCredentials(username: string, password: string): Promise<User | null> {
  const user = findUserWithHash(username)

  if (!user) {
    dummyHash ??= hashPassword('dummy-password-for-timing')
    await argon2.verify(await dummyHash, password).catch(() => false)
    return null
  }

  const ok = await argon2.verify(user.passwordHash, password).catch(() => false)
  if (!ok) return null

  return { id: user.id, username: user.username, displayName: user.displayName }
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const hash = getPasswordHash(userId)
  const ok = hash ? await argon2.verify(hash, currentPassword).catch(() => false) : false
  if (!ok) throw badRequest('Current password is incorrect', { fieldErrors: { currentPassword: ['Incorrect password'] } })
  updatePasswordHash(userId, await hashPassword(newPassword))
}

export async function createUser(username: string, displayName: string, password: string): Promise<User> {
  if (countUsers() >= MAX_USERS) {
    throw new Error(`This planner already has ${MAX_USERS} users. No more accounts can be created.`)
  }
  return insertUser(username, displayName, await hashPassword(password))
}
