<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Task } from '@wedding/shared'
import ActivityItem from '@/components/ActivityItem.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useMoney } from '@/composables/useMoney'
import { useNotify } from '@/composables/useNotify'
import { dashboardService } from '@/services/dashboard'
import { tasksService } from '@/services/tasks'
import { formatDueDate, formatLongDate, isOverdue, relativeTime } from '@/utils/dates'
import { TASK_PRIORITY } from '@/utils/labels'

const { money, compactMoney } = useMoney()
const notify = useNotify()

const { data, error, reload } = useAsyncData(() => dashboardService.get())
const d = computed(() => data.value)

const countdown = computed(() => {
  const c = d.value?.countdown
  if (!c || c.state === 'unset') return null
  const days = Math.abs(c.daysRemaining ?? 0)
  if (c.state === 'today') return { big: 'Today', small: 'is the day ❤️' }
  if (c.state === 'past') return { big: `${days}`, small: days === 1 ? 'day married' : 'days married' }
  return { big: `${days}`, small: days === 1 ? 'day to go' : 'days to go' }
})

const budgetPercent = computed(() => {
  const b = d.value?.budget
  return b?.estimated ? Math.min(100, (b.paid / b.estimated) * 100) : 0
})

const busy = ref(new Set<number>())

async function complete(task: Task): Promise<void> {
  busy.value.add(task.id)
  try {
    await tasksService.setCompleted(task.id, true)
    notify.success(`Completed "${task.title}" 🎉`)
    await reload()
  } catch (err) {
    notify.error(err)
  } finally {
    busy.value.delete(task.id)
  }
}
</script>

<template>
  <div>
    <ErrorState v-if="error" message="Couldn't load your dashboard." @retry="reload" />
    <LoadingState v-else-if="!d" />

    <template v-else>
      <!-- Countdown -->
      <v-card class="hero mb-4 text-center" rounded="xl">
        <v-card-text class="py-8 py-md-10">
          <div class="text-overline text-medium-emphasis" style="letter-spacing: 0.2em !important">
            {{ d.wedding.weddingName }}
          </div>
          <template v-if="countdown">
            <div class="countdown-number font-heading text-primary">{{ countdown.big }}</div>
            <div class="text-subtitle-1 text-uppercase font-weight-medium mt-2" style="letter-spacing: 0.2em">
              {{ countdown.small }}
            </div>
            <div class="text-body-1 text-medium-emphasis mt-3">
              {{ formatLongDate(d.wedding.weddingDate) }}
              <span v-if="d.wedding.weddingLocation"> · {{ d.wedding.weddingLocation }}</span>
            </div>
          </template>
          <template v-else>
            <div class="text-h4 font-heading my-3">When is the big day?</div>
            <v-btn color="primary" variant="tonal" :to="{ name: 'settings' }" prepend-icon="mdi-calendar-heart">
              Set your wedding date
            </v-btn>
          </template>
        </v-card-text>
      </v-card>

      <!-- Summaries -->
      <v-row dense class="mb-2">
        <v-col cols="12" sm="4">
          <v-card :to="{ name: 'budget' }" class="h-100 clickable-card">
            <v-card-text>
              <div class="d-flex align-center justify-space-between">
                <span class="text-overline text-medium-emphasis">Budget</span>
                <v-icon icon="mdi-wallet-outline" color="primary" />
              </div>
              <div class="text-h5 font-weight-bold tabular-nums">{{ compactMoney(d.budget.estimated) }}</div>
              <div class="text-body-2 text-medium-emphasis">
                <template v-if="d.budget.totalBudget">of {{ compactMoney(d.budget.totalBudget) }} budget</template>
                <template v-else>estimated</template>
              </div>
              <v-progress-linear
                :model-value="budgetPercent"
                color="success"
                height="8"
                rounded
                class="mt-3"
                bg-color="surface-variant"
                bg-opacity="1"
              />
              <div class="text-caption text-medium-emphasis mt-1 tabular-nums">{{ money(d.budget.paid) }} paid</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4">
          <v-card :to="{ name: 'guests' }" class="h-100 clickable-card">
            <v-card-text>
              <div class="d-flex align-center justify-space-between">
                <span class="text-overline text-medium-emphasis">Guests</span>
                <v-icon icon="mdi-account-group-outline" color="primary" />
              </div>
              <div class="text-h5 font-weight-bold tabular-nums">{{ d.guests.attending }}</div>
              <div class="text-body-2 text-medium-emphasis">attending</div>
              <div class="text-caption text-medium-emphasis mt-3">
                {{ d.guests.invited }} invited · {{ d.guests.pending }} pending · {{ d.guests.declined }} declined
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4">
          <v-card :to="{ name: 'tasks' }" class="h-100 clickable-card">
            <v-card-text>
              <div class="d-flex align-center justify-space-between">
                <span class="text-overline text-medium-emphasis">Tasks</span>
                <v-icon icon="mdi-checkbox-marked-circle-outline" color="primary" />
              </div>
              <div class="text-h5 font-weight-bold tabular-nums">{{ d.tasks.remaining }}</div>
              <div class="text-body-2 text-medium-emphasis">remaining</div>
              <div class="text-caption mt-3" :class="d.tasks.overdue ? 'text-error font-weight-bold' : 'text-medium-emphasis'">
                {{ d.tasks.overdue }} overdue · {{ d.tasks.completed }} done
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row dense>
        <!-- Upcoming tasks -->
        <v-col cols="12" md="7">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center pt-4">
              <span class="text-h6 font-heading">Upcoming tasks</span>
              <v-spacer />
              <v-btn variant="text" size="small" color="primary" :to="{ name: 'tasks' }">All tasks</v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="d.tasks.upcoming.length === 0" class="text-body-2 text-medium-emphasis py-4 text-center">
                Nothing open. Enjoy the moment ✨
              </div>
              <v-list v-else density="comfortable" class="py-0 bg-transparent">
                <v-list-item
                  v-for="task in d.tasks.upcoming"
                  :key="task.id"
                  :value="task.id"
                  class="px-1"
                  :class="{ overdue: isOverdue(task.dueDate, false) }"
                  :to="{ name: 'tasks' }"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="false"
                      color="success"
                      :disabled="busy.has(task.id)"
                      :aria-label="`Complete ${task.title}`"
                      @click.stop.prevent="complete(task)"
                    />
                  </template>
                  <v-list-item-title class="font-weight-medium">
                    <v-icon icon="mdi-circle" size="8" :color="TASK_PRIORITY[task.priority].color" class="mr-1" />
                    {{ task.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="task.categoryName">{{ task.categoryName }}</v-list-item-subtitle>
                  <template #append>
                    <span
                      class="text-body-2 text-no-wrap mr-2"
                      :class="isOverdue(task.dueDate, false) ? 'text-error font-weight-bold' : 'text-medium-emphasis'"
                    >
                      {{ formatDueDate(task.dueDate) || 'No date' }}
                    </span>
                    <UserAvatar v-if="task.assignedTo" :user-id="task.assignedTo" :name="task.assignedToName" size="24" />
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Recent activity -->
        <v-col cols="12" md="5">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center pt-4">
              <span class="text-h6 font-heading">Recent activity</span>
              <v-spacer />
              <v-btn variant="text" size="small" color="primary" :to="{ name: 'activity' }">View all</v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="d.recentActivity.length === 0" class="text-body-2 text-medium-emphasis py-4 text-center">
                Changes either of you make will show up here.
              </div>
              <ActivityItem v-for="a in d.recentActivity" :key="a.id" :activity="a" :time="relativeTime(a.createdAt)" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at 10% 0%, rgba(201, 168, 106, 0.16), transparent 45%),
    radial-gradient(circle at 90% 100%, rgba(158, 107, 110, 0.14), transparent 50%),
    rgb(var(--v-theme-surface));
}

.countdown-number {
  font-size: clamp(4rem, 14vw, 6.5rem);
  line-height: 1;
  font-weight: 600;
  margin-top: 8px;
}
</style>
