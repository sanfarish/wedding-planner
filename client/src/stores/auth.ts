import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@wedding/shared'
import { authService } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  let initPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => user.value !== null)

  /** Loads the current session once at startup. */
  function init(): Promise<void> {
    initPromise ??= authService
      .me()
      .then((u) => {
        user.value = u
      })
      .catch(() => {
        user.value = null
      })
      .finally(() => {
        initialized.value = true
      })
    return initPromise
  }

  async function login(username: string, password: string): Promise<void> {
    user.value = await authService.login(username, password)
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } finally {
      user.value = null
    }
  }

  function setUser(u: User): void {
    user.value = u
  }

  function clear(): void {
    user.value = null
  }

  return { user, initialized, isAuthenticated, init, login, logout, setUser, clear }
})
