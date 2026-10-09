import { ref } from 'vue'
import { ApiError, errorMessage, type FieldErrors } from '@/services/api'

/** Saving/error state for a form, including per-field errors returned by the API. */
export function useFormState() {
  const saving = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<FieldErrors>({})

  function reset(): void {
    saving.value = false
    error.value = null
    fieldErrors.value = {}
  }

  /** Runs `action`, capturing errors. Returns undefined if it failed. */
  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    saving.value = true
    error.value = null
    fieldErrors.value = {}
    try {
      return await action()
    } catch (err) {
      if (err instanceof ApiError) {
        fieldErrors.value = err.fieldErrors
        error.value = err.code === 'VALIDATION_ERROR' && err.message === 'Invalid request' ? 'Please check the highlighted fields.' : err.message
      } else {
        error.value = errorMessage(err)
      }
      return undefined
    } finally {
      saving.value = false
    }
  }

  /** Error messages for one field, for `:error-messages`. */
  function errorsFor(field: string): string[] {
    return fieldErrors.value[field] ?? []
  }

  return { saving, error, fieldErrors, reset, run, errorsFor }
}
