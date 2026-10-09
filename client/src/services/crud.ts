import type { ApiItem, ApiList } from '@wedding/shared'
import { api } from './api'

export type ListQuery = Record<string, string | number | null | undefined>

/** Standard REST client for a resource at `base` (e.g. /api/tasks). */
export function crud<T, Input, Q extends ListQuery = ListQuery, M = Record<string, never>>(base: string) {
  return {
    list: (query?: Q) => api.get<ApiList<T, M>>(base, query),
    get: (id: number) => api.get<ApiItem<T>>(`${base}/${id}`).then((r) => r.data),
    create: (input: Input) => api.post<ApiItem<T>>(base, input).then((r) => r.data),
    update: (id: number, input: Partial<Input>) => api.patch<ApiItem<T>>(`${base}/${id}`, input).then((r) => r.data),
    remove: (id: number) => api.delete(`${base}/${id}`),
  }
}
