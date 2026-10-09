<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import type { Activity } from '@wedding/shared'
import ActivityItem from '@/components/ActivityItem.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { errorMessage } from '@/services/api'
import { activityService } from '@/services/activity'
import { formatLongDate, formatTime, localDateOf, today, toDateString } from '@/utils/dates'

const PAGE_SIZE = 50

const items = shallowRef<Activity[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

async function loadMore(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await activityService.list(page.value + 1, PAGE_SIZE)
    items.value = [...items.value, ...res.data]
    total.value = res.meta.total
    page.value += 1
    loaded.value = true
  } catch (err) {
    error.value = errorMessage(err, "Couldn't load activity.")
  } finally {
    loading.value = false
  }
}
void loadMore()

const yesterday = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateString(d)
})()

const groups = computed(() => {
  const result: { date: string; label: string; items: Activity[] }[] = []
  for (const a of items.value) {
    const date = localDateOf(a.createdAt)
    let group = result.at(-1)
    if (!group || group.date !== date) {
      const label = date === today() ? 'Today' : date === yesterday ? 'Yesterday' : formatLongDate(date)
      group = { date, label, items: [] }
      result.push(group)
    }
    group.items.push(a)
  }
  return result
})

const hasMore = computed(() => items.value.length < total.value)
</script>

<template>
  <div>
    <PageHeader title="Activity" subtitle="Everything either of you changed" />

    <ErrorState v-if="error && !loaded" :message="error" @retry="loadMore" />
    <LoadingState v-else-if="!loaded" />
    <EmptyState
      v-else-if="items.length === 0"
      icon="mdi-history"
      title="No activity yet"
      message="When either of you adds or updates something, it will appear here."
    />

    <template v-else>
      <div v-for="group in groups" :key="group.date" class="mb-5">
        <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-2">{{ group.label }}</div>
        <v-card>
          <v-card-text class="py-2">
            <template v-for="(a, index) in group.items" :key="a.id">
              <v-divider v-if="index > 0" class="my-1" />
              <ActivityItem :activity="a" :time="formatTime(a.createdAt)" />
            </template>
          </v-card-text>
        </v-card>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
      <div v-if="hasMore" class="text-center">
        <v-btn variant="tonal" color="primary" :loading="loading" @click="loadMore">Load more</v-btn>
      </div>
    </template>
  </div>
</template>
