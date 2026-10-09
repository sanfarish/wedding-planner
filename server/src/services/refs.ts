import { db } from '../db/index.js'
import { badRequest } from '../utils/errors.js'

type RefTable = 'users' | 'task_categories' | 'budget_categories' | 'vendors'

/** Throws a 400 when a referenced row does not exist. Skips null/undefined. */
export function assertRef(table: RefTable, id: number | null | undefined, field: string): void {
  if (id === null || id === undefined) return
  const found = db().prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id)
  if (!found) throw badRequest(`Unknown ${field}`, { fieldErrors: { [field]: ['Does not exist'] } })
}

/** Current UTC time in SQLite CURRENT_TIMESTAMP format. */
export function nowSql(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}
