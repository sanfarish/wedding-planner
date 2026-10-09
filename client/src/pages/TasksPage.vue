<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, Task, TaskStatus } from '@wedding/shared'
import DataTable from '@/components/DataTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusChip from '@/components/StatusChip.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import TaskForm from '@/components/forms/TaskForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useDebounced } from '@/composables/useDebounced'
import { useNotify } from '@/composables/useNotify'
import { tasksService } from '@/services/tasks'
import { useAuthStore } from '@/stores/auth'
import { useWeddingStore } from '@/stores/wedding'
import { formatDueDate, isOverdue } from '@/utils/dates'
import { selectItems, TASK_PRIORITY, TASK_STATUS } from '@/utils/labels'

const auth = useAuthStore()
const wedding = useWeddingStore()
const notify = useNotify()

const filters = reactive({
  status: null as TaskStatus | null,
  assignedTo: null as number | null,
  categoryId: null as number | null,
})
const search = useDebounced('')
const searchInput = ref('')
watch(searchInput, (v) => (search.value = v))
const showFilters = ref(false)

type Quick = 'all' | 'mine' | 'partner' | 'completed'
const quick = computed<Quick>({
  get() {
    if (filters.status === 'completed' && !filters.assignedTo) return 'completed'
    if (!filters.status && filters.assignedTo === auth.user?.id) return 'mine'
    if (!filters.status && filters.assignedTo && filters.assignedTo === wedding.partner?.id) return 'partner'
    return 'all'
  },
  set(value) {
    filters.status = value === 'completed' ? 'completed' : null
    filters.assignedTo = value === 'mine' ? (auth.user?.id ?? null) : value === 'partner' ? (wedding.partner?.id ?? null) : null
  },
})

const categories = ref<Category[]>([])
tasksService.categories().then((c) => (categories.value = c), () => {})

const { data, loading, error, reload } = useAsyncData(() =>
  tasksService.list({ ...filters, search: search.value }).then((r) => r.data),
)
watch([filters, search], () => void reload())

const tasks = computed(() => data.value ?? [])
const hasFilters = computed(() => !!(filters.status || filters.assignedTo || filters.categoryId || search.value))
const openCount = computed(() => tasks.value.filter((t) => t.status !== 'completed').length)
const overdueCount = computed(() => tasks.value.filter((t) => isOverdue(t.dueDate, t.status === 'completed')).length)
const subtitle = computed(() => {
  const parts = [`${openCount.value} open`]
  if (overdueCount.value) parts.push(`${overdueCount.value} overdue`)
  return parts.join(' · ')
})

const headers = [
  { title: '', key: 'done', sortable: false, width: 48 },
  { title: 'Task', key: 'title' },
  { title: 'Due', key: 'dueDate', width: 120 },
  { title: 'Assigned', key: 'assignedToName', width: 140 },
  { title: 'Priority', key: 'priority', width: 110 },
  { title: 'Status', key: 'status', width: 130 },
]

const userItems = computed(() => wedding.users.map((u) => ({ title: u.displayName, value: u.id })))
const categoryItems = computed(() => categories.value.map((c) => ({ title: c.name, value: c.id })))

const formOpen = ref(false)
const editing = ref<Task | null>(null)

function openNew(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(task: Task): void {
  editing.value = task
  formOpen.value = true
}

function rowClass(task: Task): string | undefined {
  const classes = []
  if (isOverdue(task.dueDate, task.status === 'completed')) classes.push('overdue')
  if (task.status === 'completed') classes.push('completed-row')
  return classes.join(' ') || undefined
}

const toggling = ref(new Set<number>())

async function toggleComplete(task: Task): Promise<void> {
  if (toggling.value.has(task.id)) return
  toggling.value.add(task.id)
  try {
    const updated = await tasksService.setCompleted(task.id, task.status !== 'completed')
    data.value = tasks.value.map((t) => (t.id === updated.id ? updated : t))
    notify.success(updated.status === 'completed' ? `Completed "${updated.title}" 🎉` : `Reopened "${updated.title}"`)
  } catch (err) {
    notify.error(err)
  } finally {
    toggling.value.delete(task.id)
  }
}

function clearFilters(): void {
  Object.assign(filters, { status: null, assignedTo: null, categoryId: null })
  searchInput.value = ''
}
</script>

<template>
  <div>
    <PageHeader title="Tasks" :subtitle="data ? subtitle : undefined">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Add task</v-btn>
      </template>
    </PageHeader>

    <div class="d-flex flex-wrap align-center gap-2 mb-3">
      <v-chip-group v-model="quick" mandatory selected-class="text-primary" color="primary">
        <v-chip value="all" variant="outlined" filter>All</v-chip>
        <v-chip value="mine" variant="outlined" filter>Mine</v-chip>
        <v-chip v-if="wedding.partner" value="partner" variant="outlined" filter>{{ wedding.partner.displayName }}'s</v-chip>
        <v-chip value="completed" variant="outlined" filter>Completed</v-chip>
      </v-chip-group>
    </div>

    <div class="d-flex align-center gap-2 mb-3">
      <v-text-field
        v-model="searchInput"
        placeholder="Search tasks"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        class="flex-grow-1"
        style="max-width: 420px"
      />
      <v-btn
        :variant="showFilters ? 'tonal' : 'text'"
        prepend-icon="mdi-filter-variant"
        :color="hasFilters ? 'primary' : undefined"
        @click="showFilters = !showFilters"
      >
        Filters
      </v-btn>
    </div>

    <v-expand-transition>
      <v-row v-show="showFilters" dense class="mb-2">
        <v-col cols="12" sm="4">
          <v-select v-model="filters.status" :items="selectItems(TASK_STATUS)" label="Status" density="compact" clearable hide-details />
        </v-col>
        <v-col cols="12" sm="4">
          <v-select v-model="filters.categoryId" :items="categoryItems" label="Category" density="compact" clearable hide-details />
        </v-col>
        <v-col cols="12" sm="4">
          <v-select v-model="filters.assignedTo" :items="userItems" label="Assigned to" density="compact" clearable hide-details />
        </v-col>
      </v-row>
    </v-expand-transition>

    <ErrorState v-if="error" message="Couldn't load your tasks." @retry="reload" />
    <LoadingState v-else-if="!data" />
    <EmptyState
      v-else-if="tasks.length === 0 && !hasFilters"
      icon="mdi-checkbox-marked-circle-outline"
      title="No tasks yet"
      message="Add the first thing you need to do — like booking the venue."
      action-text="Add task"
      @action="openNew"
    />
    <EmptyState
      v-else-if="tasks.length === 0"
      icon="mdi-magnify"
      title="No matching tasks"
      message="Try a different search or clear the filters."
    />

    <DataTable v-else :headers="headers" :items="tasks" :loading="loading" :row-class="rowClass" @click="openEdit">
      <template #[`item.done`]="{ item }">
        <v-checkbox-btn
          :model-value="item.status === 'completed'"
          color="success"
          :aria-label="item.status === 'completed' ? `Reopen ${item.title}` : `Complete ${item.title}`"
          :disabled="toggling.has(item.id)"
          @click.stop="toggleComplete(item)"
        />
      </template>
      <template #[`item.title`]="{ item }">
        <div class="py-2">
          <div class="task-title font-weight-medium">{{ item.title }}</div>
          <div v-if="item.categoryName" class="text-caption text-medium-emphasis">{{ item.categoryName }}</div>
        </div>
      </template>
      <template #[`item.dueDate`]="{ item }">
        <span :class="{ 'text-error font-weight-medium': isOverdue(item.dueDate, item.status === 'completed') }">
          {{ formatDueDate(item.dueDate) || '—' }}
        </span>
      </template>
      <template #[`item.assignedToName`]="{ item }">
        <div v-if="item.assignedTo" class="d-flex align-center">
          <UserAvatar :user-id="item.assignedTo" :name="item.assignedToName" size="24" />
          <span class="ml-2">{{ item.assignedToName }}</span>
        </div>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #[`item.priority`]="{ item }">
        <StatusChip :meta="TASK_PRIORITY[item.priority]" />
      </template>
      <template #[`item.status`]="{ item }">
        <StatusChip :meta="TASK_STATUS[item.status]" />
      </template>

      <template #card="{ item }">
        <div class="d-flex align-start pa-3">
          <v-checkbox-btn
            :model-value="item.status === 'completed'"
            color="success"
            class="flex-grow-0 mr-1"
            style="margin-top: -6px"
            :aria-label="item.status === 'completed' ? `Reopen ${item.title}` : `Complete ${item.title}`"
            :disabled="toggling.has(item.id)"
            @click.stop="toggleComplete(item)"
          />
          <div class="flex-grow-1" style="min-width: 0" :class="{ 'completed-row': item.status === 'completed' }">
            <div class="task-title font-weight-medium">{{ item.title }}</div>
            <div class="d-flex flex-wrap align-center gap-2 mt-2">
              <StatusChip :meta="TASK_PRIORITY[item.priority]" />
              <StatusChip v-if="item.status === 'in_progress'" :meta="TASK_STATUS[item.status]" />
              <span
                v-if="item.dueDate"
                class="text-caption"
                :class="isOverdue(item.dueDate, item.status === 'completed') ? 'text-error font-weight-bold' : 'text-medium-emphasis'"
              >
                <v-icon icon="mdi-calendar-outline" size="14" /> {{ formatDueDate(item.dueDate) }}
              </span>
              <span v-if="item.categoryName" class="text-caption text-medium-emphasis">{{ item.categoryName }}</span>
            </div>
          </div>
          <UserAvatar v-if="item.assignedTo" :user-id="item.assignedTo" :name="item.assignedToName" size="28" class="ml-2" />
        </div>
      </template>
    </DataTable>

    <div v-if="hasFilters && data" class="text-center mt-4">
      <v-btn variant="text" size="small" prepend-icon="mdi-filter-remove-outline" @click="clearFilters">Clear filters</v-btn>
    </div>

    <TaskForm v-model="formOpen" :task="editing" :categories="categories" @saved="reload" @deleted="reload" />
  </div>
</template>
