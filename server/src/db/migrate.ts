import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DB } from './connection.js'

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

/** Applies pending NNN_name.sql migrations in order. Returns the ids applied. */
export function runMigrations(db: DB, dir = MIGRATIONS_DIR): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const applied = new Set(
    db.prepare('SELECT id FROM migrations').all().map((row) => (row as { id: string }).id),
  )

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f))
    .sort()

  const insert = db.prepare('INSERT INTO migrations (id) VALUES (?)')
  const newlyApplied: string[] = []

  for (const file of files) {
    const id = file.replace(/\.sql$/, '')
    if (applied.has(id)) continue

    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    db.transaction(() => {
      db.exec(sql)
      insert.run(id)
    })()
    newlyApplied.push(id)
  }

  return newlyApplied
}
