import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCountdown, getDashboard } from '../src/services/dashboard.js'
import { todayLocal } from '../src/utils/dates.js'
import { setup, type TestContext } from './helpers.js'

describe('countdown', () => {
  it('handles upcoming, today, past and unset', () => {
    expect(getCountdown('2027-01-10', '2026-10-09')).toEqual({ state: 'upcoming', daysRemaining: 93, date: '2027-01-10' })
    expect(getCountdown('2027-01-10', '2027-01-10')).toMatchObject({ state: 'today', daysRemaining: 0 })
    expect(getCountdown('2027-01-10', '2027-01-12')).toMatchObject({ state: 'past', daysRemaining: -2 })
    expect(getCountdown(null, '2026-10-09')).toEqual({ state: 'unset', daysRemaining: null, date: null })
  })

  it('is not affected by daylight-saving style offsets', () => {
    expect(getCountdown('2027-03-30', '2027-03-20').daysRemaining).toBe(10)
    expect(getCountdown('2028-03-01', '2028-02-28').daysRemaining).toBe(2) // leap year
  })
})

describe('dashboard', () => {
  let ctx: TestContext

  beforeEach(async () => {
    ctx = await setup()
  })
  afterEach(() => ctx.close())

  it('aggregates data from every module', async () => {
    const { agent } = ctx
    await agent.patch('/api/settings/wedding').send({ weddingDate: '2027-01-10', totalBudget: 100_000_000 }).expect(200)

    await agent.post('/api/tasks').send({ title: 'Overdue', dueDate: '2026-10-01' }).expect(201)
    await agent.post('/api/tasks').send({ title: 'Soon', dueDate: '2026-10-12' }).expect(201)
    await agent.post('/api/tasks').send({ title: 'Undated' }).expect(201)
    await agent.post('/api/tasks').send({ title: 'Done', dueDate: '2026-09-01', status: 'completed' }).expect(201)

    await agent.post('/api/expenses').send({ description: 'Venue', estimatedAmount: 60_000_000, actualAmount: 30_000_000 }).expect(201)
    await agent.post('/api/guests').send({ name: 'A', numberOfGuests: 3, rsvpStatus: 'attending', invitationStatus: 'invited' }).expect(201)
    await agent.post('/api/guests').send({ name: 'B', numberOfGuests: 2 }).expect(201)

    const data = getDashboard('2026-10-09')

    expect(data.countdown).toEqual({ state: 'upcoming', daysRemaining: 93, date: '2027-01-10' })
    expect(data.tasks).toMatchObject({ total: 4, completed: 1, remaining: 3, overdue: 1 })
    expect(data.tasks.upcoming.map((t) => t.title)).toEqual(['Overdue', 'Soon', 'Undated'])
    expect(data.budget).toMatchObject({ totalBudget: 100_000_000, estimated: 60_000_000, paid: 30_000_000, remaining: 30_000_000 })
    expect(data.guests).toMatchObject({ entries: 2, total: 5, invited: 3, attending: 3, pending: 2, declined: 0 })
    expect(data.recentActivity.length).toBeGreaterThan(0)
    expect(data.recentActivity[0]!.userName).toBe('Alice')
  })

  it('is served at GET /api/dashboard', async () => {
    const res = await ctx.agent.get('/api/dashboard').expect(200)
    expect(res.body.data.countdown.state).toBe('unset')
    expect(res.body.data.wedding.weddingName).toBe('Our Wedding')
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
