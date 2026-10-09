import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setup, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await setup()
})
afterEach(() => ctx.close())

/** Create → read → update → list → delete → 404, for a simple resource. */
async function crudRoundTrip(path: string, create: object, update: object, check: object) {
  const created = (await ctx.agent.post(path).send(create).expect(201)).body.data
  await ctx.agent.get(`${path}/${created.id}`).expect(200)
  const updated = (await ctx.agent.patch(`${path}/${created.id}`).send(update).expect(200)).body.data
  expect(updated).toMatchObject(check)
  const list = (await ctx.agent.get(path).expect(200)).body
  expect(list.meta.total).toBe(1)
  await ctx.agent.delete(`${path}/${created.id}`).expect(204)
  await ctx.agent.get(`${path}/${created.id}`).expect(404)
}

describe('vendors', () => {
  it('supports CRUD', () =>
    crudRoundTrip(
      '/api/vendors',
      { name: 'Lens Studio', category: 'Photography', quotedAmount: 12_000_000, website: 'https://example.com' },
      { status: 'booked', quotedAmount: 11_000_000 },
      { status: 'booked', quotedAmount: 11_000_000, name: 'Lens Studio' },
    ))

  it('validates status and website', async () => {
    await ctx.agent.post('/api/vendors').send({ name: 'x', status: 'hired' }).expect(400)
    await ctx.agent.post('/api/vendors').send({ name: 'x', website: 'javascript:alert(1)' }).expect(400)
    const ok = await ctx.agent.post('/api/vendors').send({ name: 'x', website: '' }).expect(201)
    expect(ok.body.data.website).toBeNull()
  })

  it('filters by status and search', async () => {
    await ctx.agent.post('/api/vendors').send({ name: 'Photo One', status: 'booked' }).expect(201)
    await ctx.agent.post('/api/vendors').send({ name: 'Cater Two' }).expect(201)
    expect((await ctx.agent.get('/api/vendors?status=booked').expect(200)).body.data).toHaveLength(1)
    expect((await ctx.agent.get('/api/vendors?search=photo').expect(200)).body.data).toHaveLength(1)
  })
})

describe('timeline', () => {
  it('supports CRUD', () =>
    crudRoundTrip(
      '/api/timeline',
      { title: 'Ceremony', eventDate: '2027-01-10', startTime: '10:00', endTime: '11:00' },
      { location: 'Garden Hall' },
      { location: 'Garden Hall', startTime: '10:00' },
    ))

  it('validates dates and times', async () => {
    await ctx.agent.post('/api/timeline').send({ title: 'x' }).expect(400)
    await ctx.agent.post('/api/timeline').send({ title: 'x', eventDate: '2027-02-30' }).expect(400)
    await ctx.agent.post('/api/timeline').send({ title: 'x', eventDate: '2027-01-10', startTime: '25:00' }).expect(400)
    await ctx.agent
      .post('/api/timeline')
      .send({ title: 'x', eventDate: '2027-01-10', startTime: '11:00', endTime: '10:00' })
      .expect(400)

    const ev = (
      await ctx.agent.post('/api/timeline').send({ title: 'x', eventDate: '2027-01-10', startTime: '11:00' }).expect(201)
    ).body.data
    // End time before the stored start time is rejected on partial update as well
    await ctx.agent.patch(`/api/timeline/${ev.id}`).send({ endTime: '09:00' }).expect(400)
  })

  it('orders events chronologically', async () => {
    await ctx.agent.post('/api/timeline').send({ title: 'Reception', eventDate: '2027-01-10', startTime: '13:00' }).expect(201)
    await ctx.agent.post('/api/timeline').send({ title: 'Ceremony', eventDate: '2027-01-10', startTime: '10:00' }).expect(201)
    await ctx.agent.post('/api/timeline').send({ title: 'Book venue', eventDate: '2026-10-12' }).expect(201)
    const titles = (await ctx.agent.get('/api/timeline').expect(200)).body.data.map((e: { title: string }) => e.title)
    expect(titles).toEqual(['Book venue', 'Ceremony', 'Reception'])
  })
})

describe('notes', () => {
  it('supports CRUD', () =>
    crudRoundTrip(
      '/api/notes',
      { title: 'Venue questions', content: 'Parking?' },
      { content: 'Parking?\nOvertime fee?' },
      { content: 'Parking?\nOvertime fee?', createdByName: 'Alice' },
    ))
})

describe('documents', () => {
  it('supports CRUD', () =>
    crudRoundTrip(
      '/api/documents',
      { title: 'Contract', url: 'https://drive.google.com/file/1' },
      { category: 'Contract' },
      { category: 'Contract', url: 'https://drive.google.com/file/1' },
    ))

  it('requires an http(s) URL', async () => {
    await ctx.agent.post('/api/documents').send({ title: 'x' }).expect(400)
    await ctx.agent.post('/api/documents').send({ title: 'x', url: 'ftp://example.com' }).expect(400)
    await ctx.agent.post('/api/documents').send({ title: 'x', url: 'javascript:alert(1)' }).expect(400)
  })
})

describe('settings', () => {
  it('reads and updates the wedding settings', async () => {
    const initial = (await ctx.agent.get('/api/settings/wedding').expect(200)).body.data
    expect(initial).toMatchObject({ weddingName: 'Our Wedding', currency: 'IDR', totalBudget: 0, weddingDate: null })

    const res = await ctx.agent
      .patch('/api/settings/wedding')
      .send({ weddingDate: '2027-01-10', brideName: 'Bride', totalBudget: 100_000_000, weddingLocation: '' })
      .expect(200)
    expect(res.body.data).toMatchObject({ weddingDate: '2027-01-10', brideName: 'Bride', weddingLocation: null })

    await ctx.agent.patch('/api/settings/wedding').send({ currency: 'XYZ' }).expect(400)
    await ctx.agent.patch('/api/settings/wedding').send({ weddingName: '' }).expect(400)
  })
})
