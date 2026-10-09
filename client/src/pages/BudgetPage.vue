<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, Expense, ExpenseStatus, Vendor } from '@wedding/shared'
import DataTable from '@/components/DataTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusChip from '@/components/StatusChip.vue'
import ExpenseForm from '@/components/forms/ExpenseForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useDebounced } from '@/composables/useDebounced'
import { useMoney } from '@/composables/useMoney'
import { budgetService } from '@/services/budget'
import { vendorsService } from '@/services/vendors'
import { formatDueDate, isOverdue } from '@/utils/dates'
import { EXPENSE_STATUS, selectItems } from '@/utils/labels'

const { money } = useMoney()

const filters = reactive({ status: null as ExpenseStatus | null, categoryId: null as number | null })
const search = useDebounced('')
const searchInput = ref('')
watch(searchInput, (v) => (search.value = v))

const summary = useAsyncData(() => budgetService.summary())
const expenses = useAsyncData(() =>
  budgetService.expenses.list({ ...filters, search: search.value }).then((r) => r.data),
)
watch([filters, search], () => void expenses.reload())

const categories = ref<Category[]>([])
const vendors = ref<Vendor[]>([])
budgetService.categories().then((c) => (categories.value = c), () => {})
vendorsService.list().then((r) => (vendors.value = r.data), () => {})

const rows = computed(() => expenses.data.value ?? [])
const hasFilters = computed(() => !!(filters.status || filters.categoryId || search.value))
const s = computed(() => summary.data.value)

const paidPercent = computed(() => (s.value?.estimated ? Math.min(100, (s.value.paid / s.value.estimated) * 100) : 0))
const allocatedPercent = computed(() =>
  s.value?.totalBudget ? Math.min(100, (s.value.estimated / s.value.totalBudget) * 100) : 0,
)
const overBudget = computed(() => !!s.value && s.value.totalBudget > 0 && s.value.estimated > s.value.totalBudget)

const headers = [
  { title: 'Expense', key: 'description' },
  { title: 'Category', key: 'categoryName', width: 140 },
  { title: 'Estimated', key: 'estimatedAmount', align: 'end' as const, width: 150 },
  { title: 'Paid', key: 'actualAmount', align: 'end' as const, width: 150 },
  { title: 'Status', key: 'status', width: 130 },
  { title: 'Paid by', key: 'paidByName', width: 110 },
  { title: 'Due', key: 'dueDate', width: 110 },
]

const categoryItems = computed(() => categories.value.map((c) => ({ title: c.name, value: c.id })))

const formOpen = ref(false)
const editing = ref<Expense | null>(null)

function openNew(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(expense: Expense): void {
  editing.value = expense
  formOpen.value = true
}
function refresh(): void {
  void expenses.reload()
  void summary.reload()
}

function rowClass(e: Expense): string | undefined {
  return e.status !== 'paid' && e.status !== 'cancelled' && isOverdue(e.dueDate, false) ? 'overdue' : undefined
}
</script>

<template>
  <div>
    <PageHeader title="Budget">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Add expense</v-btn>
      </template>
    </PageHeader>

    <ErrorState v-if="summary.error.value" message="Couldn't load the budget." @retry="refresh" />
    <template v-else-if="s">
      <v-row dense class="mb-2">
        <v-col cols="6" md="3">
          <StatCard
            label="Total budget"
            :value="s.totalBudget ? money(s.totalBudget) : 'Not set'"
            icon="mdi-piggy-bank-outline"
            :to="s.totalBudget ? undefined : { name: 'settings' }"
            :sub="s.totalBudget ? undefined : 'Set it in Settings'"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard label="Estimated" :value="money(s.estimated)" icon="mdi-calculator-variant-outline" color="info" />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard label="Paid" :value="money(s.paid)" icon="mdi-check-decagram-outline" color="success" />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard label="Remaining to pay" :value="money(s.remaining)" icon="mdi-cash-clock" color="warning" />
        </v-col>
      </v-row>

      <v-row dense class="mb-4">
        <v-col cols="12" md="5">
          <v-card class="h-100">
            <v-card-text>
              <div class="d-flex justify-space-between text-body-2 mb-1">
                <span>Paid</span>
                <span class="tabular-nums">{{ Math.round(paidPercent) }}% of estimate</span>
              </div>
              <v-progress-linear :model-value="paidPercent" color="success" height="10" rounded bg-color="surface-variant" bg-opacity="1" />

              <template v-if="s.totalBudget">
                <div class="d-flex justify-space-between text-body-2 mt-4 mb-1">
                  <span>Allocated</span>
                  <span class="tabular-nums">{{ Math.round(allocatedPercent) }}% of budget</span>
                </div>
                <v-progress-linear
                  :model-value="allocatedPercent"
                  :color="overBudget ? 'error' : 'primary'"
                  height="10"
                  rounded
                  bg-color="surface-variant"
                  bg-opacity="1"
                />
                <div class="text-body-2 mt-3" :class="overBudget ? 'text-error font-weight-medium' : 'text-medium-emphasis'">
                  <template v-if="overBudget">Estimates exceed the budget by {{ money(-s.unallocated) }}</template>
                  <template v-else>{{ money(s.unallocated) }} not yet allocated</template>
                </div>
              </template>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="7">
          <v-card class="h-100">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">By category</v-card-title>
            <v-card-text>
              <div v-if="s.byCategory.length === 0" class="text-body-2 text-medium-emphasis py-2">
                Add expenses to see the breakdown.
              </div>
              <div v-for="c in s.byCategory" :key="c.categoryId ?? 'none'" class="mb-3">
                <div class="d-flex justify-space-between text-body-2 mb-1 gap-2">
                  <span class="font-weight-medium text-truncate">{{ c.categoryName }}</span>
                  <span class="tabular-nums text-medium-emphasis text-no-wrap">
                    {{ money(c.paid) }} / {{ money(c.estimated) }}
                  </span>
                </div>
                <v-progress-linear
                  :model-value="c.estimated ? (c.paid / c.estimated) * 100 : 0"
                  color="primary"
                  height="6"
                  rounded
                  bg-color="surface-variant"
                  bg-opacity="1"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
    <LoadingState v-else />

    <div class="d-flex flex-wrap align-center gap-2 mb-3">
      <v-text-field
        v-model="searchInput"
        placeholder="Search expenses"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        style="min-width: 200px; max-width: 360px"
        class="flex-grow-1"
      />
      <v-select
        v-model="filters.status"
        :items="selectItems(EXPENSE_STATUS)"
        label="Status"
        density="compact"
        hide-details
        clearable
        style="max-width: 180px; min-width: 140px"
      />
      <v-select
        v-model="filters.categoryId"
        :items="categoryItems"
        label="Category"
        density="compact"
        hide-details
        clearable
        style="max-width: 200px; min-width: 140px"
      />
    </div>

    <ErrorState v-if="expenses.error.value" message="Couldn't load expenses." @retry="expenses.reload" />
    <LoadingState v-else-if="!expenses.data.value" />
    <EmptyState
      v-else-if="rows.length === 0 && !hasFilters"
      icon="mdi-wallet-outline"
      title="No expenses yet"
      message="Track what you plan to spend and what has been paid."
      action-text="Add expense"
      @action="openNew"
    />
    <EmptyState v-else-if="rows.length === 0" icon="mdi-magnify" title="No matching expenses" />

    <DataTable v-else :headers="headers" :items="rows" :loading="expenses.loading.value" :row-class="rowClass" @click="openEdit">
      <template #[`item.description`]="{ item }">
        <div class="py-2">
          <div class="font-weight-medium" :class="{ 'text-decoration-line-through text-medium-emphasis': item.status === 'cancelled' }">
            {{ item.description }}
          </div>
          <div v-if="item.vendorName" class="text-caption text-medium-emphasis">{{ item.vendorName }}</div>
        </div>
      </template>
      <template #[`item.categoryName`]="{ item }">{{ item.categoryName ?? '—' }}</template>
      <template #[`item.estimatedAmount`]="{ item }"><span class="tabular-nums">{{ money(item.estimatedAmount) }}</span></template>
      <template #[`item.actualAmount`]="{ item }"><span class="tabular-nums">{{ money(item.actualAmount) }}</span></template>
      <template #[`item.status`]="{ item }"><StatusChip :meta="EXPENSE_STATUS[item.status]" /></template>
      <template #[`item.paidByName`]="{ item }">{{ item.paidByName ?? '—' }}</template>
      <template #[`item.dueDate`]="{ item }">{{ formatDueDate(item.dueDate) || '—' }}</template>

      <template #card="{ item }">
        <div class="pa-3">
          <div class="d-flex align-start justify-space-between gap-2">
            <div style="min-width: 0">
              <div class="font-weight-medium" :class="{ 'text-decoration-line-through text-medium-emphasis': item.status === 'cancelled' }">
                {{ item.description }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ [item.categoryName, item.vendorName].filter(Boolean).join(' · ') || 'Uncategorised' }}
              </div>
            </div>
            <StatusChip :meta="EXPENSE_STATUS[item.status]" />
          </div>
          <div class="d-flex justify-space-between mt-2 text-body-2 tabular-nums">
            <span><span class="text-medium-emphasis">Est.</span> {{ money(item.estimatedAmount) }}</span>
            <span><span class="text-medium-emphasis">Paid</span> {{ money(item.actualAmount) }}</span>
          </div>
          <div v-if="item.dueDate || item.paidByName" class="text-caption text-medium-emphasis mt-1">
            <span v-if="item.dueDate">Due {{ formatDueDate(item.dueDate) }}</span>
            <span v-if="item.dueDate && item.paidByName"> · </span>
            <span v-if="item.paidByName">Paid by {{ item.paidByName }}</span>
          </div>
        </div>
      </template>
    </DataTable>

    <ExpenseForm
      v-model="formOpen"
      :expense="editing"
      :categories="categories"
      :vendors="vendors"
      @saved="refresh"
      @deleted="refresh"
    />
  </div>
</template>
