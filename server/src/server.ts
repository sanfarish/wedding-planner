import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/connection.js'
import { runMigrations } from './db/migrate.js'

const db = openDatabase(config.databasePath)

// Off by default in production (run `db:migrate` explicitly); the container image turns it on.
if (config.migrateOnStart) {
  const applied = runMigrations(db)
  if (applied.length) console.log(`Applied migrations: ${applied.join(', ')}`)
}

const { app, sessionStore } = createApp(db)

const server = app.listen(config.port, config.host, () => {
  console.log(`Wedding planner API listening on http://${config.host}:${config.port} (${config.env})`)
})

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    sessionStore.close()
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
