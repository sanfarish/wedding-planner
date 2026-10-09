import { config } from '../config.js'
import { openDatabase } from '../db/connection.js'
import { runMigrations } from '../db/migrate.js'

const db = openDatabase(config.databasePath)
try {
  const applied = runMigrations(db)
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database is up to date.')
  console.log(`Database: ${config.databasePath}`)
} finally {
  db.close()
}
