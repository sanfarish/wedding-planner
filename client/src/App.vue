<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { notifyState } from '@/composables/useNotify'
</script>

<template>
  <v-app>
    <router-view />

    <ConfirmDialog />

    <v-snackbar
      v-model="notifyState.open"
      :color="notifyState.color"
      :timeout="notifyState.color === 'error' ? 6000 : 3000"
      location="top"
      rounded="lg"
    >
      {{ notifyState.message }}
      <template #actions>
        <v-btn variant="text" icon="mdi-close" size="small" aria-label="Dismiss" @click="notifyState.open = false" />
      </template>
    </v-snackbar>
  </v-app>
</template>
