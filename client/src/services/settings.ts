import type { ApiItem, ApiList, User, WeddingSettings } from '@wedding/shared'
import { api } from './api'

export type WeddingSettingsInput = Partial<Omit<WeddingSettings, 'updatedAt'>>

export const settingsService = {
  getWedding: () => api.get<ApiItem<WeddingSettings>>('/api/settings/wedding').then((r) => r.data),
  updateWedding: (input: WeddingSettingsInput) =>
    api.patch<ApiItem<WeddingSettings>>('/api/settings/wedding', input).then((r) => r.data),
  users: () => api.get<ApiList<User>>('/api/users').then((r) => r.data),
}
