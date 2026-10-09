import type { ApiItem, Dashboard } from '@wedding/shared'
import { api } from './api'

export const dashboardService = {
  get: () => api.get<ApiItem<Dashboard>>('/api/dashboard').then((r) => r.data),
}
