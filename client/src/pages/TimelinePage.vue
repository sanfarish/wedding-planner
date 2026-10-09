<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TimelineEvent } from '@wedding/shared'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import TimelineEventForm from '@/components/forms/TimelineEventForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { timelineService } from '@/services/timeline'
import { useWeddingStore } from '@/stores/wedding'
import { formatDate, formatLongDate, formatMonth, formatShortDate, today } from '@/utils/dates'

const wedding = useWeddingStore()
const weddingDate = computed(() => wedding.settings?.weddingDate ?? null)

const tab = ref<'planning' | 'day'>('planning')
const { data, error, reload } = useAsyncData(() => timelineService.list().then((r) => r.data))
const events = computed(() => data.value ?? [])

const dayEvents = computed(() => events.value.filter((e) => e.eventDate === weddingDate.value))
const planningEvents = computed(() => events.value.filter((e) => e.eventDate !== weddingDate.value))

type PlanningItem = { kind: 'event'; event: TimelineEvent } | { kind: 'wedding'; date: string }

/** Planning events grouped by month, with the wedding day itself as a marker. */
const months = computed(() => {
  const items: PlanningItem[] = planningEvents.value.map((event) => ({ kind: 'event', event }))
  if (weddingDate.value) items.push({ kind: 'wedding', date: weddingDate.value })
  const dateOf = (i: PlanningItem) => (i.kind === 'event' ? i.event.eventDate : i.date)
  items.sort((a, b) => dateOf(a).localeCompare(dateOf(b)))

  const groups: { key: string; label: string; items: PlanningItem[] }[] = []
  for (const item of items) {
    const key = dateOf(item).slice(0, 7)
    let group = groups.at(-1)
    if (!group || group.key !== key) {
      group = { key, label: formatMonth(`${key}-01`), items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})

const categories = computed(() => [...new Set(events.value.map((e) => e.category).filter((c): c is string => !!c))].sort())

const formOpen = ref(false)
const editing = ref<TimelineEvent | null>(null)
const defaultDate = computed(() => (tab.value === 'day' ? weddingDate.value : null))

function openNew(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(event: TimelineEvent): void {
  editing.value = event
  formOpen.value = true
}

function timeRange(e: TimelineEvent): string {
  if (!e.startTime) return ''
  return e.endTime ? `${e.startTime} – ${e.endTime}` : e.startTime
}

const todayStr = today()
</script>

<template>
  <div>
    <PageHeader title="Timeline">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Add event</v-btn>
      </template>
    </PageHeader>

    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="planning" prepend-icon="mdi-calendar-month-outline">Planning</v-tab>
      <v-tab value="day" prepend-icon="mdi-heart-outline">Wedding day</v-tab>
    </v-tabs>

    <ErrorState v-if="error" message="Couldn't load the timeline." @retry="reload" />
    <LoadingState v-else-if="!data" />

    <template v-else-if="tab === 'planning'">
      <EmptyState
        v-if="months.length === 0"
        icon="mdi-timeline-clock-outline"
        title="Nothing planned yet"
        message="Add milestones like booking the venue or sending invitations."
        action-text="Add event"
        @action="openNew"
      />
      <div v-for="month in months" :key="month.key" class="mb-6">
        <div class="text-h5 font-heading mb-2">{{ month.label }}</div>
        <v-timeline side="end" density="compact" align="start" truncate-line="both" line-color="surface-variant">
          <template v-for="item in month.items" :key="item.kind === 'event' ? item.event.id : 'wedding'">
            <v-timeline-item v-if="item.kind === 'wedding'" dot-color="primary" icon="mdi-heart" size="small">
              <div class="py-1">
                <div class="text-h6 font-heading text-primary">Wedding Day ❤️</div>
                <div class="text-body-2 text-medium-emphasis">{{ formatLongDate(item.date) }}</div>
              </div>
            </v-timeline-item>
            <v-timeline-item
              v-else
              :dot-color="item.event.eventDate < todayStr ? 'surface-variant' : 'secondary'"
              size="x-small"
            >
              <v-card
                class="clickable-card"
                :class="{ 'opacity-60': item.event.eventDate < todayStr }"
                min-width="240"
                @click="openEdit(item.event)"
              >
                <v-card-text class="py-3">
                  <div class="d-flex justify-space-between gap-2">
                    <span class="font-weight-medium">{{ item.event.title }}</span>
                    <span class="text-caption text-medium-emphasis text-no-wrap">{{ formatShortDate(item.event.eventDate) }}</span>
                  </div>
                  <div v-if="item.event.category || item.event.location || item.event.startTime" class="text-caption text-medium-emphasis">
                    {{ [timeRange(item.event), item.event.location, item.event.category].filter(Boolean).join(' · ') }}
                  </div>
                  <div v-if="item.event.description" class="text-body-2 mt-1 pre-wrap">{{ item.event.description }}</div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </template>
        </v-timeline>
      </div>
    </template>

    <template v-else>
      <EmptyState
        v-if="!weddingDate"
        icon="mdi-calendar-heart"
        title="Set your wedding date first"
        message="The wedding-day schedule shows events on your wedding date."
      />
      <div v-if="!weddingDate" class="text-center">
        <v-btn color="primary" variant="tonal" :to="{ name: 'settings' }">Open settings</v-btn>
      </div>
      <template v-else>
        <div class="text-body-1 text-medium-emphasis mb-3">{{ [formatDate(weddingDate), wedding.settings?.weddingLocation].filter(Boolean).join(' · ') }}</div>
        <EmptyState
          v-if="dayEvents.length === 0"
          icon="mdi-clock-heart"
          title="No schedule yet"
          message="Add the plan for the day — makeup, ceremony, photos, reception."
          action-text="Add to schedule"
          @action="openNew"
        />
        <v-card v-else>
          <v-list lines="two" class="py-0">
            <template v-for="(e, index) in dayEvents" :key="e.id">
              <v-divider v-if="index > 0" />
              <v-list-item class="py-3" @click="openEdit(e)">
                <template #prepend>
                  <div class="text-h6 font-weight-bold tabular-nums text-primary mr-4" style="min-width: 56px">
                    {{ e.startTime ?? '—' }}
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">{{ e.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ [e.endTime ? `until ${e.endTime}` : '', e.location].filter(Boolean).join(' · ') || e.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-list>
        </v-card>
      </template>
    </template>

    <TimelineEventForm
      v-model="formOpen"
      :event="editing"
      :default-date="defaultDate"
      :categories="categories"
      @saved="reload"
      @deleted="reload"
    />
  </div>
</template>
