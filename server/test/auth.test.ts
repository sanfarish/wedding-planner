import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PASSWORDS, setup, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await setup()
})
afterEach(() => ctx.close())

describe('login', () => {
  it('logs in with valid credentials and sets an HttpOnly, SameSite=Lax cookie', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'bob', password: PASSWORDS.bob })
      .expect(200)

    expect(res.body.data).toEqual({ id: ctx.bob.id, username: 'bob', displayName: 'Bob' })
    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toMatch(/^wp\.sid=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(res.body.data).not.toHaveProperty('passwordHash')
  })

  it('accepts the username case-insensitively', async () => {
    await request(ctx.app).post('/api/auth/login').send({ username: 'ALICE', password: PASSWORDS.alice }).expect(200)
  })

  it('returns the same generic 401 for a wrong password and an unknown user', async () => {
    const wrong = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'not-the-password' })
      .expect(401)
    const unknown = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'mallory', password: 'whatever-password' })
      .expect(401)

    expect(wrong.body.error.message).toBe('Invalid username or password')
    expect(unknown.body).toEqual(wrong.body)
    expect(wrong.headers['set-cookie']).toBeUndefined()
  })

  it('rejects a malformed login body with 400', async () => {
    await request(ctx.app).post('/api/auth/login').send({ username: 'alice' }).expect(400)
  })

  it('rate-limits after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(ctx.app).post('/api/auth/login').send({ username: 'alice', password: 'wrong-password' }).expect(401)
    }
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: PASSWORDS.alice })
      .expect(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})

describe('session', () => {
  it('returns the current user from /me', async () => {
    const res = await ctx.agent.get('/api/auth/me').expect(200)
    expect(res.body.data.username).toBe('alice')
  })

  it('blocks private API routes without a session', async () => {
    for (const path of ['/api/tasks', '/api/expenses', '/api/guests', '/api/dashboard', '/api/users', '/api/auth/me']) {
      const res = await request(ctx.app).get(path).expect(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('keeps the health check public', async () => {
    await request(ctx.app).get('/api/health').expect(200)
  })

  it('rejects a tampered session cookie', async () => {
    await request(ctx.app).get('/api/tasks').set('Cookie', 'wp.sid=s%3Aforged.signature').expect(401)
  })

  it('rejects an expired session', async () => {
    ctx.db.prepare('UPDATE sessions SET expires = ?').run(Date.now() - 1000)
    await ctx.agent.get('/api/tasks').expect(401)
  })

  it('logs out and invalidates the session', async () => {
    await ctx.agent.post('/api/auth/logout').expect(204)
    await ctx.agent.get('/api/auth/me').expect(401)
    expect((ctx.db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(0)
  })

  it('requires JSON for mutating requests', async () => {
    await ctx.agent.post('/api/tasks').set('Content-Type', 'text/plain').send('title=x').expect(415)
  })
})

describe('account', () => {
  it('changes the display name', async () => {
    const res = await ctx.agent.patch('/api/auth/me').send({ displayName: 'Alice W.' }).expect(200)
    expect(res.body.data.displayName).toBe('Alice W.')
  })

  it('changes the password only with the correct current password', async () => {
    await ctx.agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'brand-new-password' })
      .expect(400)
    await ctx.agent
      .patch('/api/auth/password')
      .send({ currentPassword: PASSWORDS.alice, newPassword: 'short' })
      .expect(400)
    await ctx.agent
      .patch('/api/auth/password')
      .send({ currentPassword: PASSWORDS.alice, newPassword: 'brand-new-password' })
      .expect(204)

    await request(ctx.app).post('/api/auth/login').send({ username: 'alice', password: PASSWORDS.alice }).expect(401)
    await request(ctx.app).post('/api/auth/login').send({ username: 'alice', password: 'brand-new-password' }).expect(200)
  })

  it('lists exactly the two users', async () => {
    const res = await ctx.agent.get('/api/users').expect(200)
    expect(res.body.data.map((u: { username: string }) => u.username)).toEqual(['alice', 'bob'])
  })
})
