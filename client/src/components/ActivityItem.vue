<script setup lang="ts">
import type { Activity, ActivityAction } from '@wedding/shared'
import UserAvatar from './UserAvatar.vue'

defineProps<{ activity: Activity; time: string }>()

const ICONS: Record<ActivityAction, string> = {
  create: 'mdi-plus-circle-outline',
  update: 'mdi-pencil-outline',
  delete: 'mdi-delete-outline',
  complete: 'mdi-check-circle-outline',
  reopen: 'mdi-restore',
}

/** "Completed task …" → "completed task …" so it reads after the name. */
function sentence(description: string): string {
  return description.charAt(0).toLowerCase() + description.slice(1)
}
</script>

<template>
  <div class="d-flex align-start py-2">
    <UserAvatar :user-id="activity.userId" :name="activity.userName" size="32" class="mr-3 flex-shrink-0" />
    <div class="flex-grow-1" style="min-width: 0">
      <div class="text-body-2">
        <strong>{{ activity.userName }}</strong> {{ sentence(activity.description) }}
      </div>
      <div class="text-caption text-medium-emphasis">
        <v-icon :icon="ICONS[activity.action]" size="12" class="mr-1" />{{ time }}
      </div>
    </div>
  </div>
</template>
