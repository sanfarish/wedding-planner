import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { categoryIdByName, loginAs, setup, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await setup()
})
afterEach(() => ctx.close())

async function createTask(body: Record<string, unknown>) {
  const res = await ctx.agent.post('/api/tasks').send(body).expect(201)
  return res.body.data
}

describe('tasks', () => {
  it('creates a task with defaults and joined names', async () => {
    const venue = categoryIdByName(ctx.db, 'task_categories', 'Venue')
    const task = await createTask({ title: '  Book venue ', categoryId: venue, assignedTo: ctx.bob.id, dueDate: '2026-11-01' })

    expect(task).toMatchObject({
      title: 'Book venue',
      status: 'todo',
      priority: 'medium',
      categoryName: 'Venue',
      assignedToName: 'Bob',
      createdBy: ctx.alice.id,
      completedAt: null,
    })
  })

  it('validates input', async () => {
    const res = await ctx.agent.post('/api/tasks').send({ title: '', priority: 'whenever', dueDate: '01/11/2026' }).expect(400)
    expect(Object.keys(res.body.error.details.fieldErrors).sort()).toEqual(['dueDate', 'priority', 'title'])

    await ctx.agent.post('/api/tasks').send({ title: 'x', assignedTo: 999 }).expect(400)
    await ctx.agent.get('/api/tasks/abc').expect(400)
    await ctx.agent.get('/api/tasks/999').expect(404)
  })

  it('records the session user as creator, ignoring client-supplied ids', async () => {
    const task = await createTask({ title: 'Mine', createdBy: ctx.bob.id })
    expect(task.createdBy).toBe(ctx.alice.id)
  })

  it('updates fields and clears nullable ones', async () => {
    const task = await createTask({ title: 'Draft', description: 'something', dueDate: '2026-11-01' })
    const res = await ctx.agent
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'Final', description: '', dueDate: null, priority: 'urgent' })
      .expect(200)
    expect(res.body.data).toMatchObject({ title: 'Final', description: null, dueDate: null, priority: 'urgent' })
  })

  it('completes and reopens, maintaining completedAt', async () => {
    const task = await createTask({ title: 'Send invitations' })

    const done = await ctx.agent.patch(`/api/tasks/${task.id}/complete`).send({ completed: true }).expect(200)
    expect(done.body.data.status).toBe('completed')
    expect(done.body.data.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const reopened = await ctx.agent.patch(`/api/tasks/${task.id}/complete`).send({ completed: false }).expect(200)
    expect(reopened.body.data.status).toBe('todo')
    expect(reopened.body.data.completedAt).toBeNull()

    // Status changes through PATCH also maintain completedAt
    const viaPatch = await ctx.agent.patch(`/api/tasks/${task.id}`).send({ status: 'completed' }).expect(200)
    expect(viaPatch.body.data.completedAt).not.toBeNull()
  })

  it('deletes a task', async () => {
    const task = await createTask({ title: 'Temporary' })
    await ctx.agent.delete(`/api/tasks/${task.id}`).expect(204)
    await ctx.agent.get(`/api/tasks/${task.id}`).expect(404)
  })

  it('filters by status, assignee, category and search', async () => {
    const venue = categoryIdByName(ctx.db, 'task_categories', 'Venue')
    const photo = categoryIdByName(ctx.db, 'task_categories', 'Photography')
    await createTask({ title: 'Book venue', categoryId: venue, assignedTo: ctx.alice.id, status: 'completed' })
    await createTask({ title: 'Visit venue again', categoryId: venue, assignedTo: ctx.bob.id })
    await createTask({ title: 'Choose 50% discount_photographer', categoryId: photo, assignedTo: ctx.bob.id })

    const titles = async (query: string) =>
      (await ctx.agent.get(`/api/tasks${query}`).expect(200)).body.data.map((t: { title: string }) => t.title)

    expect(await titles('?status=completed')).toEqual(['Book venue'])
    expect(await titles(`?assignedTo=${ctx.bob.id}`)).toHaveLength(2)
    expect(await titles(`?categoryId=${venue}`)).toHaveLength(2)
    expect(await titles('?search=venue')).toHaveLength(2)
    expect(await titles(`?search=venue&assignedTo=${ctx.bob.id}`)).toEqual(['Visit venue again'])
    // LIKE wildcards in the search term are matched literally
    expect(await titles('?search=50%25')).toEqual(['Choose 50% discount_photographer'])
    expect(await titles('?search=_')).toEqual(['Choose 50% discount_photographer'])
    expect(await titles('?status=')).toHaveLength(3)

    await ctx.agent.get('/api/tasks?status=bogus').expect(400)

    const page = await ctx.agent.get('/api/tasks?limit=2&page=2').expect(200)
    expect(page.body.data).toHaveLength(1)
    expect(page.body.meta.total).toBe(3)
  })

  it('logs activity for both users', async () => {
    const task = await createTask({ title: 'Book venue' })
    const bob = await loginAs(ctx.app, 'bob')
    await bob.patch(`/api/tasks/${task.id}/complete`).send({ completed: true }).expect(200)

    const res = await ctx.agent.get('/api/activity').expect(200)
    expect(res.body.data.map((a: { userName: string; description: string }) => `${a.userName}: ${a.description}`)).toEqual([
      'Bob: Completed task "Book venue"',
      'Alice: Added task "Book venue"',
    ])
  })

  it('manages task categories', async () => {
    const created = await ctx.agent.post('/api/task-categories').send({ name: 'Music' }).expect(201)
    await ctx.agent.post('/api/task-categories').send({ name: 'music' }).expect(409)

    const task = await createTask({ title: 'Book band', categoryId: created.body.data.id })
    await ctx.agent.delete(`/api/task-categories/${created.body.data.id}`).expect(204)

    const after = await ctx.agent.get(`/api/tasks/${task.id}`).expect(200)
    expect(after.body.data.categoryId).toBeNull()
  })
})
