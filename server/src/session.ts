import session from 'express-session'
import { config } from './config.js'
import { SqliteSessionStore } from './db/sessionStore.js'

export const SESSION_COOKIE = 'wp.sid'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function createSessionMiddleware(store: SqliteSessionStore) {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...sessionCookieOptions(), maxAge: THIRTY_DAYS_MS },
  })
}
