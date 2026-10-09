import { reactive } from 'vue'
import { errorMessage } from '@/services/api'

/** Shared snackbar state rendered once in App.vue. */
export const notifyState = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error' | 'info',
})

function show(message: string, color: typeof notifyState.color): void {
  notifyState.message = message
  notifyState.color = color
  notifyState.open = true
}

export function useNotify() {
  return {
    success: (message: string) => show(message, 'success'),
    info: (message: string) => show(message, 'info'),
    error: (errOrMessage: unknown) =>
      show(typeof errOrMessage === 'string' ? errOrMessage : errorMessage(errOrMessage), 'error'),
  }
}
