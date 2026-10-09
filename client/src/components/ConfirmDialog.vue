<script setup lang="ts">
import { confirmState, settleConfirm } from '@/composables/useConfirm'
</script>

<template>
  <v-dialog
    :model-value="confirmState.open"
    max-width="420"
    @update:model-value="(open: boolean) => !open && settleConfirm(false)"
  >
    <v-card>
      <v-card-title class="text-wrap pt-5 px-6">{{ confirmState.title }}</v-card-title>
      <v-card-text v-if="confirmState.message" class="px-6 text-medium-emphasis">{{ confirmState.message }}</v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="settleConfirm(false)">{{ confirmState.cancelText }}</v-btn>
        <v-btn :color="confirmState.danger ? 'error' : 'primary'" variant="flat" @click="settleConfirm(true)">
          {{ confirmState.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
