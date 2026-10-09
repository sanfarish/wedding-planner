<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ userId: number | null; name: string | null; size?: string | number }>(), {
  size: 28,
})

const COLORS = ['primary', 'secondary', 'accent', 'info']

const initials = computed(() =>
  (props.name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join(''),
)
const color = computed(() => COLORS[((props.userId ?? 0) - 1 + COLORS.length) % COLORS.length])
</script>

<template>
  <v-avatar :size="size" :color="color" class="text-caption font-weight-bold" :title="name ?? undefined">
    {{ initials }}
  </v-avatar>
</template>
