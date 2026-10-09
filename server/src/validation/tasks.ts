import { z } from 'zod'
import type { TaskPriority, TaskStatus } from '@wedding/shared'
import {
  enumValues,
  id,
  optionalDate,
  optionalRef,
  optionalText,
  paginationQuery,
  query,
  requiredText,
  searchQuery,
} from './common.js'

export const TASK_STATUSES = enumValues<TaskStatus>()(['todo', 'in_progress', 'completed'])
export const TASK_PRIORITIES = enumValues<TaskPriority>()(['low', 'medium', 'high', 'urgent'])

export const taskCreateSchema = z.object({
  title: requiredText(200),
  description: optionalText(5000),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  categoryId: optionalRef,
  dueDate: optionalDate,
  assignedTo: optionalRef,
})

export const taskUpdateSchema = taskCreateSchema.partial()

export const taskCompleteSchema = z.object({
  completed: z.boolean(),
})

export const taskQuerySchema = z.object({
  status: query(z.enum(TASK_STATUSES)),
  assignedTo: query(id),
  categoryId: query(id),
  search: searchQuery,
  ...paginationQuery,
})

export type TaskCreate = z.infer<typeof taskCreateSchema>
export type TaskUpdate = z.infer<typeof taskUpdateSchema>
export type TaskQuery = z.infer<typeof taskQuerySchema>
