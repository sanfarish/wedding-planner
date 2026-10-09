<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; value: string | number; sub?: string; icon?: string; color?: string; to?: object }>(),
  { color: 'primary' },
)
</script>

<template>
  <v-card :to="to" class="h-100" :class="{ 'clickable-card': to }">
    <v-card-text class="d-flex align-start">
      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-caption text-uppercase text-medium-emphasis font-weight-medium" style="letter-spacing: 0.06em">
          {{ label }}
        </div>
        <div class="text-h6 font-weight-bold tabular-nums text-truncate mt-1">{{ value }}</div>
        <div v-if="sub" class="text-body-2 text-medium-emphasis">{{ sub }}</div>
        <slot />
      </div>
      <v-avatar v-if="icon" :color="color" variant="tonal" size="40" class="ml-3 flex-shrink-0">
        <v-icon :icon="icon" size="22" />
      </v-avatar>
    </v-card-text>
  </v-card>
</template>
