<script setup lang="ts">
withDefaults(
  defineProps<{ icon?: string; title: string; message?: string; actionText?: string }>(),
  { icon: 'mdi-flower-tulip-outline' },
)
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="d-flex flex-column align-center text-center py-12 px-4">
    <v-avatar size="72" color="surface-variant" class="mb-4">
      <v-icon :icon="icon" size="36" color="primary" />
    </v-avatar>
    <div class="text-h5 font-heading">{{ title }}</div>
    <div v-if="message" class="text-body-2 text-medium-emphasis mt-1" style="max-width: 420px">{{ message }}</div>
    <v-btn v-if="actionText" color="primary" class="mt-5" prepend-icon="mdi-plus" @click="emit('action')">
      {{ actionText }}
    </v-btn>
  </div>
</template>
