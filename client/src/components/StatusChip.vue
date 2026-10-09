<script setup lang="ts">
import type { StatusMeta } from '@/utils/labels'

withDefaults(defineProps<{ meta: StatusMeta; size?: string; showIcon?: boolean }>(), { size: 'small' })
</script>

<template>
  <v-chip :color="meta.color" :size="size" variant="tonal" label class="font-weight-medium">
    <v-icon v-if="showIcon && meta.icon" :icon="meta.icon" start size="small" />
    {{ meta.label }}
  </v-chip>
</template>
