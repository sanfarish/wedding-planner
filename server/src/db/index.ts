import type { DB } from './connection.js'

let current: DB | null = null

/** Registers the database used by services. Called once by createApp (and by tests). */
export function setDb(database: DB): void {
  current = database
}

export function db(): DB {
  if (!current) throw new Error('Database has not been initialised')
  return current
}

export type { DB }
