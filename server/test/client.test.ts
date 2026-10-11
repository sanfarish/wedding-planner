import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { parseTrustProxy } from '../src/config.js'
import { PASSWORDS, setup, type TestContext } from './helpers.js'

let clientDir: string
let ctx: TestContext | undefined

beforeAll(() => {
  clientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-client-'))
  fs.mkdirSync(path.join(clientDir, 'assets'))
  fs.writeFileSync(path.join(clientDir, 'index.html'), '<!doctype html><div id="app"></div>')
  fs.writeFileSync(path.join(clientDir, 'assets', 'app-abc123.js'), 'console.log(1)')
  fs.writeFileSync(path.join(clientDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
})

afterAll(() => fs.rmSync(clientDir, { recursive: true, force: true }))

afterEach(() => {
  ctx?.close()
  ctx = undefined
})

describe('serving the built client', () => {
  it('renders index.html for the root and client-side routes, without caching', async () => {
    ctx = await setup({ clientDir })
    for (const route of ['/', '/tasks', '/guests/anything']) {
      const res = await request(ctx.app).get(route).expect(200)
      expect(res.text).toContain('<div id="app">')
      expect(res.headers['cache-control']).toBe('no-cache')
    }
  })

  it('serves fingerprinted assets with a long cache and 404s missing ones', async () => {
    ctx = await setup({ clientDir })
    const res = await request(ctx.app).get('/assets/app-abc123.js').expect(200)
    expect(res.headers['cache-control']).toContain('max-age=31536000')
    expect(res.headers['cache-control']).toContain('immutable')

    const missing = await request(ctx.app).get('/assets/nope.js').expect(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
  })

  it('serves other static files such as robots.txt', async () => {
    ctx = await setup({ clientDir })
    const res = await request(ctx.app).get('/robots.txt').expect(200)
    expect(res.text).toContain('Disallow')
  })

  it('keeps the API behaviour unchanged', async () => {
    ctx = await setup({ clientDir })
    // Unknown API paths are a JSON 404 (401 when logged out), never index.html
    const res = await ctx.agent.get('/api/nope').expect(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    await request(ctx.app).get('/api/nope').expect(401)
    await request(ctx.app).get('/api/tasks').expect(401)
    await ctx.agent.get('/api/tasks').expect(200)
  })

  it('only falls back to index.html for GET requests', async () => {
    ctx = await setup({ clientDir })
    const res = await request(ctx.app).post('/tasks').send({}).expect(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('serves the API only when client serving is off', async () => {
    ctx = await setup({ clientDir: null })
    await request(ctx.app).get('/').expect(404)
    await request(ctx.app).get('/assets/app-abc123.js').expect(404)
  })
})

describe('trust proxy', () => {
  it('parses TRUST_PROXY values', () => {
    expect(parseTrustProxy(undefined)).toBe('loopback')
    expect(parseTrustProxy('')).toBe('loopback')
    expect(parseTrustProxy('1')).toBe(1)
    expect(parseTrustProxy('true')).toBe(true)
    expect(parseTrustProxy('FALSE')).toBe(false)
    expect(parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8')
  })

  // The container sits behind Nginx with TRUST_PROXY=1. (The Secure cookie that
  // depends on X-Forwarded-Proto is only set in production; it is checked against the image.)
  it('with one trusted hop, rate-limits by the forwarded client IP', async () => {
    ctx = await setup({ trustProxy: 1 })
    const attempt = (ip: string) =>
      request(ctx!.app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ username: 'alice', password: 'wrong-password' })

    for (let i = 0; i < 5; i++) await attempt('203.0.113.7').expect(401)
    await attempt('203.0.113.7').expect(429)
    // A different client is not affected by the first one's failures
    await request(ctx.app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '198.51.100.9')
      .send({ username: 'alice', password: PASSWORDS.alice })
      .expect(200)
  })
})
