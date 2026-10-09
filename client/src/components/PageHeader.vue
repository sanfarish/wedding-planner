<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-5">
    <div>
      <h1 class="text-h4 font-heading">{{ title }}</h1>
      <div v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</div>
    </div>
    <div class="d-flex flex-wrap align-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
