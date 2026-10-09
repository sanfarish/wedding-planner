import type { ApiItem, User } from '@wedding/shared'
import { api } from './api'

export const authService = {
  login: (username: string, password: string) =>
    api.post<ApiItem<User>>('/api/auth/login', { username, password }).then((r) => r.data),
  logout: () => api.post<void>('/api/auth/logout'),
  me: () => api.get<ApiItem<User>>('/api/auth/me').then((r) => r.data),
  updateMe: (displayName: string) => api.patch<ApiItem<User>>('/api/auth/me', { displayName }).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<void>('/api/auth/password', { currentPassword, newPassword }),
}
