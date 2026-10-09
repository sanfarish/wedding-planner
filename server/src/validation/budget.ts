import { z } from 'zod'
import type { ExpenseStatus } from '@wedding/shared'
import {
  enumValues,
  id,
  money,
  optionalDate,
  optionalRef,
  optionalText,
  paginationQuery,
  query,
  requiredText,
  searchQuery,
} from './common.js'

export const EXPENSE_STATUSES = enumValues<ExpenseStatus>()(['planned', 'partial', 'paid', 'cancelled'])

export const expenseCreateSchema = z.object({
  description: requiredText(200),
  categoryId: optionalRef,
  vendorId: optionalRef,
  estimatedAmount: money.optional(),
  actualAmount: money.optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  paidBy: optionalRef,
  dueDate: optionalDate,
  notes: optionalText(5000),
})

export const expenseUpdateSchema = expenseCreateSchema.partial()

export const expenseQuerySchema = z.object({
  categoryId: query(id),
  vendorId: query(id),
  status: query(z.enum(EXPENSE_STATUSES)),
  search: searchQuery,
  ...paginationQuery,
})

export type ExpenseCreate = z.infer<typeof expenseCreateSchema>
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>
