import { computed } from 'vue'
import { useWeddingStore } from '@/stores/wedding'

const LOCALE = 'id-ID'

/** Currency formatting using the wedding's configured currency. Amounts are whole units. */
export function useMoney() {
  const wedding = useWeddingStore()

  const formatter = computed(
    () =>
      new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: wedding.currency,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
  )

  const compactFormatter = computed(
    () =>
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: wedding.currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
  )

  /** "Rp 7.500.000" */
  function money(amount: number | null | undefined): string {
    return formatter.value.format(amount ?? 0)
  }

  /** "IDR 7.5M": short form for cards on small screens */
  function compactMoney(amount: number | null | undefined): string {
    return compactFormatter.value.format(amount ?? 0)
  }

  /** Currency symbol, e.g. "Rp" */
  const symbol = computed(
    () => formatter.value.formatToParts(0).find((p) => p.type === 'currency')?.value ?? wedding.currency,
  )

  return { money, compactMoney, symbol }
}
