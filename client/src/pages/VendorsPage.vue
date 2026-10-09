<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Vendor, VendorStatus } from '@wedding/shared'
import DataTable from '@/components/DataTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusChip from '@/components/StatusChip.vue'
import VendorForm from '@/components/forms/VendorForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useDebounced } from '@/composables/useDebounced'
import { useMoney } from '@/composables/useMoney'
import { vendorsService } from '@/services/vendors'
import { selectItems, VENDOR_STATUS } from '@/utils/labels'

const { money } = useMoney()

const status = ref<VendorStatus | null>(null)
const search = useDebounced('')
const searchInput = ref('')
watch(searchInput, (v) => (search.value = v))

const { data, loading, error, reload } = useAsyncData(() =>
  vendorsService.list({ status: status.value, search: search.value }).then((r) => r.data),
)
watch([status, search], () => void reload())

const vendors = computed(() => data.value ?? [])
const hasFilters = computed(() => !!(status.value || search.value))
const bookedCount = computed(() => vendors.value.filter((v) => v.status === 'booked' || v.status === 'completed').length)
const categories = computed(() => [...new Set(vendors.value.map((v) => v.category).filter((c): c is string => !!c))].sort())

const headers = [
  { title: 'Vendor', key: 'name' },
  { title: 'Category', key: 'category', width: 150 },
  { title: 'Quoted price', key: 'quotedAmount', align: 'end' as const, width: 160 },
  { title: 'Status', key: 'status', width: 140 },
  { title: 'Contact', key: 'contact', sortable: false, width: 200 },
]

const formOpen = ref(false)
const editing = ref<Vendor | null>(null)

function openNew(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(vendor: Vendor): void {
  editing.value = vendor
  formOpen.value = true
}
</script>

<template>
  <div>
    <PageHeader title="Vendors" :subtitle="data && !hasFilters ? `${bookedCount} booked of ${vendors.length}` : undefined">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Add vendor</v-btn>
      </template>
    </PageHeader>

    <div class="d-flex flex-wrap align-center gap-2 mb-3">
      <v-text-field
        v-model="searchInput"
        placeholder="Search vendors"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        class="flex-grow-1"
        style="min-width: 200px; max-width: 400px"
      />
      <v-select
        v-model="status"
        :items="selectItems(VENDOR_STATUS)"
        label="Status"
        density="compact"
        hide-details
        clearable
        style="max-width: 190px; min-width: 140px"
      />
    </div>

    <ErrorState v-if="error" message="Couldn't load vendors." @retry="reload" />
    <LoadingState v-else-if="!data" />
    <EmptyState
      v-else-if="vendors.length === 0 && !hasFilters"
      icon="mdi-storefront-outline"
      title="No vendors yet"
      message="Keep track of venues, caterers, photographers and quotes in one place."
      action-text="Add vendor"
      @action="openNew"
    />
    <EmptyState v-else-if="vendors.length === 0" icon="mdi-magnify" title="No matching vendors" />

    <DataTable v-else :headers="headers" :items="vendors" :loading="loading" @click="openEdit">
      <template #[`item.name`]="{ item }"><span class="font-weight-medium">{{ item.name }}</span></template>
      <template #[`item.category`]="{ item }">{{ item.category ?? '—' }}</template>
      <template #[`item.quotedAmount`]="{ item }">
        <span class="tabular-nums">{{ item.quotedAmount ? money(item.quotedAmount) : '—' }}</span>
      </template>
      <template #[`item.status`]="{ item }"><StatusChip :meta="VENDOR_STATUS[item.status]" /></template>
      <template #[`item.contact`]="{ item }">
        <div class="text-body-2">
          <div v-if="item.contactName">{{ item.contactName }}</div>
          <div v-if="item.phone" class="text-medium-emphasis">{{ item.phone }}</div>
          <span v-if="!item.contactName && !item.phone" class="text-medium-emphasis">—</span>
        </div>
      </template>

      <template #card="{ item }">
        <div class="pa-3">
          <div class="d-flex align-start justify-space-between gap-2">
            <div style="min-width: 0">
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ [item.category, item.contactName].filter(Boolean).join(' · ') || 'No details yet' }}
              </div>
            </div>
            <StatusChip :meta="VENDOR_STATUS[item.status]" />
          </div>
          <div class="d-flex align-center justify-space-between mt-2">
            <span class="text-body-2 tabular-nums">{{ item.quotedAmount ? money(item.quotedAmount) : 'No quote yet' }}</span>
            <v-btn
              v-if="item.phone"
              :href="`tel:${item.phone}`"
              icon="mdi-phone"
              size="small"
              variant="tonal"
              color="primary"
              :aria-label="`Call ${item.name}`"
              @click.stop
            />
          </div>
        </div>
      </template>
    </DataTable>

    <VendorForm v-model="formOpen" :vendor="editing" :categories="categories" @saved="reload" @deleted="reload" />
  </div>
</template>
