import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState extends Required<Omit<ConfirmOptions, 'message'>> {
  open: boolean
  message: string
  resolve: ((value: boolean) => void) | null
}

/** Shared state rendered by the single <ConfirmDialog> in App.vue. */
export const confirmState = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  danger: false,
  resolve: null,
})

export function settleConfirm(value: boolean): void {
  confirmState.resolve?.(value)
  confirmState.resolve = null
  confirmState.open = false
}

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    // Resolve any dialog that is still open as cancelled.
    settleConfirm(false)
    return new Promise((resolve) => {
      Object.assign(confirmState, {
        title: options.title,
        message: options.message ?? '',
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        danger: options.danger ?? false,
        resolve,
        open: true,
      })
    })
  }

  /** Standard "Delete X? This cannot be undone." confirmation. */
  function confirmDelete(name: string, extra?: string): Promise<boolean> {
    return confirm({
      title: `Delete "${name}"?`,
      message: [extra, 'This cannot be undone.'].filter(Boolean).join(' '),
      confirmText: 'Delete',
      danger: true,
    })
  }

  return { confirm, confirmDelete }
}
