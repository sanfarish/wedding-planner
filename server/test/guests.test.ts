import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setup, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await setup()
})
afterEach(() => ctx.close())

async function createGuest(body: Record<string, unknown>) {
  return (await ctx.agent.post('/api/guests').send(body).expect(201)).body.data
}

describe('guests', () => {
  it('creates a guest with defaults', async () => {
    const guest = await createGuest({ name: 'Budi', groupName: 'Family', email: '' })
    expect(guest).toMatchObject({
      name: 'Budi',
      groupName: 'Family',
      email: null,
      invitationStatus: 'not_invited',
      rsvpStatus: 'pending',
      numberOfGuests: 1,
    })
  })

  it('validates guest count, email and statuses', async () => {
    await ctx.agent.post('/api/guests').send({ name: 'x', numberOfGuests: 0 }).expect(400)
    await ctx.agent.post('/api/guests').send({ name: 'x', email: 'not-an-email' }).expect(400)
    await ctx.agent.post('/api/guests').send({ name: 'x', rsvpStatus: 'maybe' }).expect(400)
  })

  it('updates RSVP status and logs it', async () => {
    const guest = await createGuest({ name: 'Siti' })
    const res = await ctx.agent.patch(`/api/guests/${guest.id}`).send({ rsvpStatus: 'attending' }).expect(200)
    expect(res.body.data.rsvpStatus).toBe('attending')

    const activity = (await ctx.agent.get('/api/activity').expect(200)).body.data
    expect(activity[0].description).toBe('Set RSVP for "Siti" to attending')
  })

  it('searches, filters and returns headcount summary', async () => {
    await createGuest({ name: 'Budi Santoso', groupName: 'Family', numberOfGuests: 2, rsvpStatus: 'attending', invitationStatus: 'invited' })
    await createGuest({ name: 'Siti Rahma', groupName: 'family', numberOfGuests: 4, rsvpStatus: 'declined', invitationStatus: 'invited' })
    await createGuest({ name: 'Andi', groupName: 'Friends', phone: '+62 811 555', numberOfGuests: 1 })

    const names = async (query: string) =>
      (await ctx.agent.get(`/api/guests${query}`).expect(200)).body.data.map((g: { name: string }) => g.name)

    expect(await names('?search=budi')).toEqual(['Budi Santoso'])
    expect(await names('?search=555')).toEqual(['Andi'])
    expect(await names('?rsvp=attending')).toEqual(['Budi Santoso'])
    expect(await names('?group=Family')).toEqual(['Budi Santoso', 'Siti Rahma'])
    expect(await names('?invitation=not_invited')).toEqual(['Andi'])

    const res = await ctx.agent.get('/api/guests?rsvp=attending').expect(200)
    expect(res.body.meta.total).toBe(1)
    // Summary covers all guests regardless of filters
    expect(res.body.meta.summary).toEqual({ entries: 3, total: 7, invited: 6, attending: 2, pending: 1, declined: 4 })

    const groups = (await ctx.agent.get('/api/guests/groups').expect(200)).body.data
    expect(groups).toEqual(['Family', 'Friends'])
  })

  it('deletes a guest', async () => {
    const guest = await createGuest({ name: 'Temp' })
    await ctx.agent.delete(`/api/guests/${guest.id}`).expect(204)
    await ctx.agent.get(`/api/guests/${guest.id}`).expect(404)
  })
})
