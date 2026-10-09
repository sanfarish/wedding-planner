import type { ApiItem, ApiList, Category, Task, TaskPriority, TaskStatus } from '@wedding/shared'
import { api } from './api'
import { crud } from './crud'

export interface TaskInput {
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  categoryId: number | null
  dueDate: string | null
  assignedTo: number | null
}

export interface TaskQuery {
  [key: string]: string | number | null | undefined
  status?: TaskStatus | null
  assignedTo?: number | null
  categoryId?: number | null
  search?: string | null
}

export const tasksService = {
  ...crud<Task, TaskInput, TaskQuery>('/api/tasks'),
  setCompleted: (id: number, completed: boolean) =>
    api.patch<ApiItem<Task>>(`/api/tasks/${id}/complete`, { completed }).then((r) => r.data),
  categories: () => api.get<ApiList<Category>>('/api/task-categories').then((r) => r.data),
}
