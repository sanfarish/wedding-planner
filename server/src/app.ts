import express from 'express'
import helmet from 'helmet'
import { setDb, type DB } from './db/index.js'
import { SqliteSessionStore } from './db/sessionStore.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { createLoginRateLimit } from './middleware/loginRateLimit.js'
import { requireJson } from './middleware/requireJson.js'
import { apiRoutes } from './routes/index.js'
import { createSessionMiddleware } from './session.js'

export interface CreatedApp {
  app: express.Express
  sessionStore: SqliteSessionStore
}

export function createApp(database: DB): CreatedApp {
  setDb(database)

  const app = express()
  const sessionStore = new SqliteSessionStore()

  // Nginx runs on the same machine; trust only loopback proxies for client IP and protocol.
  app.set('trust proxy', 'loopback')
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(express.json({ limit: '100kb' }))
  app.use(createSessionMiddleware(sessionStore))

  app.use('/api', requireJson, apiRoutes(createLoginRateLimit()))
  app.use('/api', notFoundHandler)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return { app, sessionStore }
}
