<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMoney } from '@/composables/useMoney'

/** Whole-number money input that shows thousands separators while typing. */
const model = defineModel<number>({ required: true })
defineProps<{ label: string; errorMessages?: string[]; hint?: string }>()

const { symbol } = useMoney()
const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const MAX = 1_000_000_000_000

const display = ref(format(model.value))

function format(n: number | null | undefined): string {
  return n ? formatter.format(n) : ''
}

function onInput(value: string): void {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  const amount = Math.min(digits ? Number(digits) : 0, MAX)
  model.value = amount
  display.value = format(amount)
}

watch(model, (n) => {
  if (n !== Number(display.value.replace(/\D/g, '') || 0)) display.value = format(n)
})
</script>

<template>
  <v-text-field
    :model-value="display"
    :label="label"
    :prefix="symbol"
    :error-messages="errorMessages"
    :hint="hint"
    inputmode="numeric"
    autocomplete="off"
    placeholder="0"
    class="tabular-nums"
    @update:model-value="onInput"
  />
</template>
