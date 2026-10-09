import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWeddingStore } from '@/stores/wedding'

export function useLogout() {
  const auth = useAuthStore()
  const wedding = useWeddingStore()
  const router = useRouter()

  return async function logout(): Promise<void> {
    try {
      await auth.logout()
    } finally {
      wedding.reset()
      await router.replace({ name: 'login' })
    }
  }
}
