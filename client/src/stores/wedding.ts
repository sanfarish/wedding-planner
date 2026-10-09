import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User, WeddingSettings } from '@wedding/shared'
import { settingsService, type WeddingSettingsInput } from '@/services/settings'
import { useAuthStore } from './auth'

/** Wedding settings and the two users: needed across the whole app. */
export const useWeddingStore = defineStore('wedding', () => {
  const settings = ref<WeddingSettings | null>(null)
  const users = ref<User[]>([])
  const loaded = ref(false)

  const weddingName = computed(() => settings.value?.weddingName ?? 'Our Wedding')
  const currency = computed(() => settings.value?.currency ?? 'IDR')

  /** The other person (not the logged-in user). */
  const partner = computed(() => {
    const me = useAuthStore().user
    return users.value.find((u) => u.id !== me?.id) ?? null
  })

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    const [s, u] = await Promise.all([settingsService.getWedding(), settingsService.users()])
    settings.value = s
    users.value = u
    loaded.value = true
  }

  async function update(input: WeddingSettingsInput): Promise<void> {
    settings.value = await settingsService.updateWedding(input)
  }

  function replaceUser(user: User): void {
    users.value = users.value.map((u) => (u.id === user.id ? user : u))
  }

  function userName(id: number | null | undefined): string | null {
    return users.value.find((u) => u.id === id)?.displayName ?? null
  }

  function reset(): void {
    settings.value = null
    users.value = []
    loaded.value = false
  }

  return { settings, users, loaded, weddingName, currency, partner, load, update, replaceUser, userName, reset }
})
