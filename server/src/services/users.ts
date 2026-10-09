import type { User } from '@wedding/shared'
import { db } from '../db/index.js'

export const MAX_USERS = 2

const USER_COLUMNS = 'id, username, display_name AS displayName'

export function listUsers(): User[] {
  return db().prepare(`SELECT ${USER_COLUMNS} FROM users ORDER BY id`).all() as User[]
}

export function findUserById(id: number): User | undefined {
  return db().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as User | undefined
}

export function findUserWithHash(username: string): (User & { passwordHash: string }) | undefined {
  return db()
    .prepare(`SELECT ${USER_COLUMNS}, password_hash AS passwordHash FROM users WHERE username = ?`)
    .get(username) as (User & { passwordHash: string }) | undefined
}

export function getPasswordHash(id: number): string | undefined {
  const row = db().prepare('SELECT password_hash AS hash FROM users WHERE id = ?').get(id) as
    | { hash: string }
    | undefined
  return row?.hash
}

export function countUsers(): number {
  return (db().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n
}

export function userExists(id: number): boolean {
  return db().prepare('SELECT 1 FROM users WHERE id = ?').get(id) !== undefined
}

export function insertUser(username: string, displayName: string, passwordHash: string): User {
  const result = db()
    .prepare('INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)')
    .run(username, displayName, passwordHash)
  return findUserById(Number(result.lastInsertRowid))!
}

export function updateDisplayName(id: number, displayName: string): User {
  db()
    .prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(displayName, id)
  return findUserById(id)!
}

export function updatePasswordHash(id: number, passwordHash: string): void {
  db()
    .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(passwordHash, id)
}
