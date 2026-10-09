import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import {
  createExpense,
  deleteExpense,
  getBudgetSummary,
  getExpense,
  listExpenses,
  updateExpense,
} from '../services/expenses.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { expenseCreateSchema, expenseQuerySchema, expenseUpdateSchema } from '../validation/budget.js'
import { paramId } from './helpers.js'

export function summary(_req: Request, res: Response): void {
  sendItem(res, getBudgetSummary())
}

export function list(req: Request, res: Response): void {
  const { rows, total } = listExpenses(expenseQuerySchema.parse(req.query))
  sendList(res, rows, total)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getExpense(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createExpense(currentUser(req).id, expenseCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateExpense(currentUser(req).id, paramId(req), expenseUpdateSchema.parse(req.body)))
}

export function remove(req: Request, res: Response): void {
  deleteExpense(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
