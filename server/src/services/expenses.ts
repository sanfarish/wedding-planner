import type { BudgetSummary, Expense } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, likeAnywhere, paginate } from '../utils/sql.js'
import type { ExpenseCreate, ExpenseQuery, ExpenseUpdate } from '../validation/budget.js'
import { logActivity } from './activity.js'
import { assertRef } from './refs.js'
import { getSettings } from './settings.js'

const SELECT = `
  SELECT e.id, e.category_id AS categoryId, c.name AS categoryName,
         e.vendor_id AS vendorId, v.name AS vendorName,
         e.description, e.estimated_amount AS estimatedAmount, e.actual_amount AS actualAmount,
         e.status, e.paid_by AS paidBy, u.display_name AS paidByName,
         e.due_date AS dueDate, e.notes, e.created_by AS createdBy,
         ${isoTimestamp('e.created_at')} AS createdAt, ${isoTimestamp('e.updated_at')} AS updatedAt
  FROM expenses e
  LEFT JOIN budget_categories c ON c.id = e.category_id
  LEFT JOIN vendors v ON v.id = e.vendor_id
  LEFT JOIN users u ON u.id = e.paid_by
`

const ORDER = ` ORDER BY e.status = 'cancelled', e.due_date IS NULL, e.due_date, e.id DESC`

const COLUMNS: { [K in keyof ExpenseUpdate]-?: string } = {
  description: 'description',
  categoryId: 'category_id',
  vendorId: 'vendor_id',
  estimatedAmount: 'estimated_amount',
  actualAmount: 'actual_amount',
  status: 'status',
  paidBy: 'paid_by',
  dueDate: 'due_date',
  notes: 'notes',
}

export function listExpenses(filters: ExpenseQuery): { rows: Expense[]; total: number } {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.categoryId) {
    where.push('e.category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.vendorId) {
    where.push('e.vendor_id = ?')
    params.push(filters.vendorId)
  }
  if (filters.status) {
    where.push('e.status = ?')
    params.push(filters.status)
  }
  if (filters.search) {
    where.push("(e.description LIKE ? ESCAPE '\\' OR e.notes LIKE ? ESCAPE '\\')")
    const pattern = likeAnywhere(filters.search)
    params.push(pattern, pattern)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql}${ORDER}${clause}`)
    .all(...params, ...pageParams) as Expense[]
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM expenses e${whereSql}`).get(...params) as { n: number }).n

  return { rows, total }
}

export function listExpensesForVendor(vendorId: number): Expense[] {
  return db().prepare(`${SELECT} WHERE e.vendor_id = ?${ORDER}`).all(vendorId) as Expense[]
}

export function getExpense(id: number): Expense {
  const row = db().prepare(`${SELECT} WHERE e.id = ?`).get(id) as Expense | undefined
  if (!row) throw notFound('Expense')
  return row
}

function assertRefs(input: ExpenseUpdate): void {
  assertRef('budget_categories', input.categoryId, 'categoryId')
  assertRef('vendors', input.vendorId, 'vendorId')
  assertRef('users', input.paidBy, 'paidBy')
}

export function createExpense(userId: number, input: ExpenseCreate): Expense {
  assertRefs(input)

  const id = db().transaction(() => {
    const result = db()
      .prepare(
        `INSERT INTO expenses (description, category_id, vendor_id, estimated_amount, actual_amount, status,
                               paid_by, due_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.description,
        input.categoryId ?? null,
        input.vendorId ?? null,
        input.estimatedAmount ?? 0,
        input.actualAmount ?? 0,
        input.status ?? 'planned',
        input.paidBy ?? null,
        input.dueDate ?? null,
        input.notes ?? null,
        userId,
      )
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'expense', newId, `Added expense "${input.description}"`)
    return newId
  })()

  return getExpense(id)
}

export function updateExpense(userId: number, id: number, patch: ExpenseUpdate): Expense {
  const existing = getExpense(id)
  assertRefs(patch)

  const update = buildUpdate('expenses', COLUMNS, patch, id)
  if (!update) return existing

  const description = patch.description ?? existing.description
  const verb = patch.status === 'paid' && existing.status !== 'paid' ? 'Marked as paid' : 'Updated expense'

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'expense', id, `${verb} "${description}"`)
  })()

  return getExpense(id)
}

export function deleteExpense(userId: number, id: number): void {
  const existing = getExpense(id)
  db().transaction(() => {
    db().prepare('DELETE FROM expenses WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'expense', id, `Deleted expense "${existing.description}"`)
  })()
}

/**
 * Budget totals, excluding cancelled expenses.
 *  - estimated: planned cost
 *  - paid: actual amount paid so far
 *  - remaining: still to pay (estimated - paid)
 *  - unallocated: total budget not yet assigned to any expense
 */
export function getBudgetSummary(): BudgetSummary {
  const { totalBudget } = getSettings()

  const totals = db()
    .prepare(
      `SELECT COALESCE(SUM(estimated_amount), 0) AS estimated, COALESCE(SUM(actual_amount), 0) AS paid
       FROM expenses WHERE status != 'cancelled'`,
    )
    .get() as { estimated: number; paid: number }

  const byCategory = db()
    .prepare(
      `SELECT e.category_id AS categoryId, COALESCE(c.name, 'Uncategorised') AS categoryName,
              SUM(e.estimated_amount) AS estimated, SUM(e.actual_amount) AS paid, COUNT(*) AS count
       FROM expenses e
       LEFT JOIN budget_categories c ON c.id = e.category_id
       WHERE e.status != 'cancelled'
       GROUP BY e.category_id
       ORDER BY estimated DESC, categoryName`,
    )
    .all() as BudgetSummary['byCategory']

  return {
    totalBudget,
    estimated: totals.estimated,
    paid: totals.paid,
    remaining: totals.estimated - totals.paid,
    unallocated: totalBudget - totals.estimated,
    byCategory,
  }
}
