import request from 'supertest'
import type { User } from '@wedding/shared'
import { createApp } from '../src/app.js'
import { openDatabase, type DB } from '../src/db/connection.js'
import { runMigrations } from '../src/db/migrate.js'
import { createUser } from '../src/services/auth.js'

export const PASSWORDS = { alice: 'alice-password-1', bob: 'bob-password-12' } as const

export interface TestContext {
  db: DB
  app: ReturnType<typeof createApp>['app']
  alice: User
  bob: User
  /** Agent logged in as alice. */
  agent: ReturnType<typeof request.agent>
  close: () => void
}

/** Fresh in-memory database with migrations, two users, and a logged-in agent. */
export async function setup(): Promise<TestContext> {
  const db = openDatabase(':memory:')
  runMigrations(db)
  const { app, sessionStore } = createApp(db)

  const alice = await createUser('alice', 'Alice', PASSWORDS.alice)
  const bob = await createUser('bob', 'Bob', PASSWORDS.bob)

  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ username: 'alice', password: PASSWORDS.alice }).expect(200)

  return {
    db,
    app,
    alice,
    bob,
    agent,
    close: () => {
      sessionStore.close()
      db.close()
    },
  }
}

export async function loginAs(app: TestContext['app'], username: keyof typeof PASSWORDS) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ username, password: PASSWORDS[username] }).expect(200)
  return agent
}

export function categoryIdByName(db: DB, table: 'task_categories' | 'budget_categories', name: string): number {
  return (db.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name) as { id: number }).id
}
