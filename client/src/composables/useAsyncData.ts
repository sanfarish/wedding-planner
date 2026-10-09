import { ref, shallowRef, type Ref } from 'vue'
import { errorMessage } from '@/services/api'

export interface AsyncData<T> {
  data: Ref<T | undefined>
  loading: Ref<boolean>
  error: Ref<string | null>
  reload: () => Promise<void>
}

/**
 * Loads data for a page. Only the latest call's result is kept, so quickly
 * changing filters can't show stale results.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, options: { immediate?: boolean } = {}): AsyncData<T> {
  const data = shallowRef<T>()
  const loading = ref(false)
  const error = ref<string | null>(null)
  let latest = 0

  async function reload(): Promise<void> {
    const call = ++latest
    loading.value = true
    error.value = null
    try {
      const result = await fetcher()
      if (call === latest) data.value = result
    } catch (err) {
      if (call === latest) error.value = errorMessage(err, "Couldn't load this page.")
    } finally {
      if (call === latest) loading.value = false
    }
  }

  if (options.immediate !== false) void reload()

  return { data, loading, error, reload }
}
