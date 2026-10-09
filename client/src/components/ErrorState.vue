<script setup lang="ts">
withDefaults(defineProps<{ message?: string | null }>(), { message: "Couldn't load this page." })
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="d-flex flex-column align-center text-center py-12 px-4" role="alert">
    <v-avatar size="64" color="surface-variant" class="mb-4">
      <v-icon icon="mdi-cloud-alert-outline" size="32" color="error" />
    </v-avatar>
    <div class="text-body-1 font-weight-medium">{{ message }}</div>
    <v-btn class="mt-4" variant="tonal" color="primary" prepend-icon="mdi-refresh" @click="emit('retry')">
      Try again
    </v-btn>
  </div>
</template>
