import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { categoryIdByName, setup, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await setup()
})
afterEach(() => ctx.close())

async function createExpense(body: Record<string, unknown>) {
  return (await ctx.agent.post('/api/expenses').send(body).expect(201)).body.data
}

describe('expenses', () => {
  it('creates an expense linked to a category, vendor and payer', async () => {
    const venueCat = categoryIdByName(ctx.db, 'budget_categories', 'Venue')
    const vendor = (await ctx.agent.post('/api/vendors').send({ name: 'Garden Hall' }).expect(201)).body.data

    const expense = await createExpense({
      description: 'Venue deposit',
      categoryId: venueCat,
      vendorId: vendor.id,
      estimatedAmount: 35_000_000,
      actualAmount: 10_000_000,
      status: 'partial',
      paidBy: ctx.bob.id,
    })

    expect(expense).toMatchObject({
      categoryName: 'Venue',
      vendorName: 'Garden Hall',
      paidByName: 'Bob',
      estimatedAmount: 35_000_000,
      actualAmount: 10_000_000,
    })

    const detail = (await ctx.agent.get(`/api/vendors/${vendor.id}`).expect(200)).body.data
    expect(detail.expenses).toHaveLength(1)
    expect(detail.expenseTotals).toEqual({ estimated: 35_000_000, paid: 10_000_000 })
  })

  it('rejects floats, negatives and unknown references', async () => {
    await ctx.agent.post('/api/expenses').send({ description: 'x', estimatedAmount: 10.5 }).expect(400)
    await ctx.agent.post('/api/expenses').send({ description: 'x', actualAmount: -1 }).expect(400)
    await ctx.agent.post('/api/expenses').send({ description: 'x', estimatedAmount: '1000' }).expect(400)
    await ctx.agent.post('/api/expenses').send({ description: 'x', vendorId: 999 }).expect(400)
    await ctx.agent.post('/api/expenses').send({ description: 'x', categoryId: 999 }).expect(400)
  })

  it('updates an expense', async () => {
    const expense = await createExpense({ description: 'Dress', estimatedAmount: 8_000_000 })
    const res = await ctx.agent
      .patch(`/api/expenses/${expense.id}`)
      .send({ actualAmount: 8_000_000, status: 'paid', paidBy: ctx.alice.id })
      .expect(200)
    expect(res.body.data).toMatchObject({ status: 'paid', actualAmount: 8_000_000, paidByName: 'Alice' })
  })

  it('computes the budget summary, excluding cancelled expenses', async () => {
    await ctx.agent.patch('/api/settings/wedding').send({ totalBudget: 100_000_000 }).expect(200)
    const venue = categoryIdByName(ctx.db, 'budget_categories', 'Venue')
    const attire = categoryIdByName(ctx.db, 'budget_categories', 'Attire')

    await createExpense({ description: 'Venue', categoryId: venue, estimatedAmount: 40_000_000, actualAmount: 20_000_000, status: 'partial' })
    await createExpense({ description: 'Dress', categoryId: attire, estimatedAmount: 8_000_000, actualAmount: 8_000_000, status: 'paid' })
    await createExpense({ description: 'Misc', estimatedAmount: 2_000_000 })
    await createExpense({ description: 'Old venue', categoryId: venue, estimatedAmount: 30_000_000, actualAmount: 5_000_000, status: 'cancelled' })

    const summary = (await ctx.agent.get('/api/budget/summary').expect(200)).body.data
    expect(summary).toMatchObject({
      totalBudget: 100_000_000,
      estimated: 50_000_000,
      paid: 28_000_000,
      remaining: 22_000_000,
      unallocated: 50_000_000,
    })
    expect(summary.byCategory).toEqual([
      { categoryId: venue, categoryName: 'Venue', estimated: 40_000_000, paid: 20_000_000, count: 1 },
      { categoryId: attire, categoryName: 'Attire', estimated: 8_000_000, paid: 8_000_000, count: 1 },
      { categoryId: null, categoryName: 'Uncategorised', estimated: 2_000_000, paid: 0, count: 1 },
    ])
  })

  it('keeps expenses when their vendor or category is deleted', async () => {
    const venue = categoryIdByName(ctx.db, 'budget_categories', 'Venue')
    const vendor = (await ctx.agent.post('/api/vendors').send({ name: 'Hall' }).expect(201)).body.data
    const expense = await createExpense({ description: 'Hall', vendorId: vendor.id, categoryId: venue })

    await ctx.agent.delete(`/api/vendors/${vendor.id}`).expect(204)
    await ctx.agent.delete(`/api/budget-categories/${venue}`).expect(204)

    const after = (await ctx.agent.get(`/api/expenses/${expense.id}`).expect(200)).body.data
    expect(after).toMatchObject({ vendorId: null, vendorName: null, categoryId: null })
  })

  it('filters expenses by status and category', async () => {
    const venue = categoryIdByName(ctx.db, 'budget_categories', 'Venue')
    await createExpense({ description: 'A', categoryId: venue, status: 'paid' })
    await createExpense({ description: 'B', status: 'planned' })

    expect((await ctx.agent.get('/api/expenses?status=paid').expect(200)).body.data).toHaveLength(1)
    expect((await ctx.agent.get(`/api/expenses?categoryId=${venue}`).expect(200)).body.meta.total).toBe(1)
  })
})
