/**
 * Online backup of the SQLite database using SQLite's backup API, which is
 * safe while the application is running (unlike copying the file).
 *   npm run backup -- [output-file]
 * Default output: server/data/backups/wedding-YYYYMMDD-HHMMSS.db
 * Prints the path of the backup file on success.
 */
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config, SERVER_ROOT } from '../config.js'

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

async function main(): Promise<void> {
  if (!fs.existsSync(config.databasePath)) throw new Error(`Database not found: ${config.databasePath}`)

  const target = path.resolve(process.argv[2] ?? path.join(SERVER_ROOT, 'data', 'backups', `wedding-${timestamp()}.db`))
  fs.mkdirSync(path.dirname(target), { recursive: true })

  const source = new Database(config.databasePath, { readonly: true, fileMustExist: true })
  try {
    await source.backup(target)
  } finally {
    source.close()
  }

  // Sanity check: the copy must open and pass an integrity check.
  const copy = new Database(target, { readonly: true })
  try {
    const result = copy.pragma('integrity_check', { simple: true })
    if (result !== 'ok') throw new Error(`Backup integrity check failed: ${String(result)}`)
  } finally {
    copy.close()
  }

  console.log(target)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
