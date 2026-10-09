<script setup lang="ts">
import { NAV_ITEMS, SETTINGS_ITEM } from '@/layouts/navigation'

/** Permanent sidebar on desktop; a temporary "More" drawer on mobile. */
defineProps<{ temporary?: boolean }>()
const open = defineModel<boolean>({ default: true })
</script>

<template>
  <v-navigation-drawer
    v-model="open"
    :permanent="!temporary"
    :temporary="temporary"
    :location="temporary ? 'right' : 'left'"
    width="232"
    color="background"
    border="e"
  >
    <v-list nav density="comfortable" class="pt-3" color="primary">
      <v-list-item
        v-for="item in NAV_ITEMS"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        rounded="lg"
        @click="temporary && (open = false)"
      />
    </v-list>

    <template #append>
      <v-list nav density="comfortable" color="primary">
        <v-list-item
          :to="SETTINGS_ITEM.to"
          :prepend-icon="SETTINGS_ITEM.icon"
          :title="SETTINGS_ITEM.title"
          rounded="lg"
          @click="temporary && (open = false)"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
