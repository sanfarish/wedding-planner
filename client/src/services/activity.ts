import type { Activity, ApiList } from '@wedding/shared'
import { api } from './api'

export const activityService = {
  list: (page = 1, limit = 50) => api.get<ApiList<Activity>>('/api/activity', { page, limit }),
}
