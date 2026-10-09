<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), { message: 'Loading…' })
</script>

<template>
  <div class="d-flex flex-column align-center justify-center py-16 text-medium-emphasis" role="status" aria-live="polite">
    <v-progress-circular indeterminate color="primary" size="36" width="3" />
    <div class="mt-4 text-body-2">{{ message }}</div>
  </div>
</template>
