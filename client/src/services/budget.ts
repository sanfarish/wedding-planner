import type { ApiItem, ApiList, BudgetSummary, Category, Expense, ExpenseStatus } from '@wedding/shared'
import { api } from './api'
import { crud } from './crud'

export interface ExpenseInput {
  description: string
  categoryId: number | null
  vendorId: number | null
  estimatedAmount: number
  actualAmount: number
  status: ExpenseStatus
  paidBy: number | null
  dueDate: string | null
  notes: string | null
}

export interface ExpenseQuery {
  [key: string]: string | number | null | undefined
  categoryId?: number | null
  vendorId?: number | null
  status?: ExpenseStatus | null
  search?: string | null
}

export const budgetService = {
  expenses: crud<Expense, ExpenseInput, ExpenseQuery>('/api/expenses'),
  summary: () => api.get<ApiItem<BudgetSummary>>('/api/budget/summary').then((r) => r.data),
  categories: () => api.get<ApiList<Category>>('/api/budget-categories').then((r) => r.data),
}
