import session from 'express-session'
import { db } from './index.js'

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const PRUNE_INTERVAL_MS = 15 * 60 * 1000

type Callback = (err?: unknown) => void

/** Minimal express-session store backed by the `sessions` table. */
export class SqliteSessionStore extends session.Store {
  private readonly pruneTimer: NodeJS.Timeout

  constructor() {
    super()
    this.pruneTimer = setInterval(() => this.prune(), PRUNE_INTERVAL_MS)
    this.pruneTimer.unref()
  }

  override get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    try {
      const row = db().prepare('SELECT sess, expires FROM sessions WHERE sid = ?').get(sid) as
        | { sess: string; expires: number }
        | undefined
      if (!row) return callback(null, null)
      if (row.expires <= Date.now()) {
        db().prepare('DELETE FROM sessions WHERE sid = ?').run(sid)
        return callback(null, null)
      }
      callback(null, JSON.parse(row.sess) as session.SessionData)
    } catch (err) {
      callback(err)
    }
  }

  override set(sid: string, sess: session.SessionData, callback?: Callback): void {
    try {
      db()
        .prepare(
          `INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`,
        )
        .run(sid, JSON.stringify(sess), expiresAt(sess))
      callback?.()
    } catch (err) {
      callback?.(err)
    }
  }

  override destroy(sid: string, callback?: Callback): void {
    try {
      db().prepare('DELETE FROM sessions WHERE sid = ?').run(sid)
      callback?.()
    } catch (err) {
      callback?.(err)
    }
  }

  override touch(sid: string, sess: session.SessionData, callback?: Callback): void {
    try {
      db().prepare('UPDATE sessions SET expires = ? WHERE sid = ?').run(expiresAt(sess), sid)
      callback?.()
    } catch (err) {
      callback?.(err)
    }
  }

  prune(): void {
    try {
      db().prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now())
    } catch (err) {
      console.error('Failed to prune sessions', err)
    }
  }

  close(): void {
    clearInterval(this.pruneTimer)
  }
}

function expiresAt(sess: session.SessionData): number {
  const expires = sess.cookie?.expires
  return expires ? new Date(expires).getTime() : Date.now() + DEFAULT_TTL_MS
}
