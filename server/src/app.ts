import path from 'node:path'
import express from 'express'
import helmet from 'helmet'
import { config, type TrustProxy } from './config.js'
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

export interface AppOptions {
  /** Directory of the built Vue app to serve, or null to serve the API only. */
  clientDir?: string | null
  trustProxy?: TrustProxy
}

export function createApp(database: DB, options: AppOptions = {}): CreatedApp {
  setDb(database)

  const clientDir = options.clientDir !== undefined ? options.clientDir : config.serveClient ? config.clientDist : null

  const app = express()
  const sessionStore = new SqliteSessionStore()

  // Default 'loopback' suits Nginx on the same host. Behind rootless Podman the
  // proxy isn't seen as loopback, so the container uses a hop count (1 = Nginx).
  app.set('trust proxy', options.trustProxy ?? config.trustProxy)
  app.disable('x-powered-by')

  app.use(helmet())

  // Static files are served before the session middleware so they never touch the session store.
  if (clientDir) {
    // Fingerprinted build output: cache for a year. Missing assets are a 404, never index.html.
    app.use('/assets', express.static(path.join(clientDir, 'assets'), { immutable: true, maxAge: '1y', index: false }))
    app.use('/assets', notFoundHandler)
    app.use(express.static(clientDir, { index: false }))
  }

  app.use(express.json({ limit: '100kb' }))
  app.use(createSessionMiddleware(sessionStore))

  app.use('/api', requireJson, apiRoutes(createLoginRateLimit()))
  app.use('/api', notFoundHandler)

  if (clientDir) {
    // Single-page app: any other GET renders index.html so client-side routes work on reload.
    const indexHtml = path.join(clientDir, 'index.html')
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next()
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(indexHtml)
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return { app, sessionStore }
}
