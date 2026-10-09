<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Guest, InvitationStatus, RsvpStatus } from '@wedding/shared'
import DataTable from '@/components/DataTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusChip from '@/components/StatusChip.vue'
import GuestForm from '@/components/forms/GuestForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useDebounced } from '@/composables/useDebounced'
import { useNotify } from '@/composables/useNotify'
import { guestsService } from '@/services/guests'
import { INVITATION_STATUS, RSVP_STATUS, selectItems } from '@/utils/labels'

const notify = useNotify()

const filters = reactive({
  rsvp: null as RsvpStatus | null,
  invitation: null as InvitationStatus | null,
  group: null as string | null,
})
const search = useDebounced('')
const searchInput = ref('')
watch(searchInput, (v) => (search.value = v))

const { data, loading, error, reload } = useAsyncData(() => guestsService.list({ ...filters, search: search.value }))
watch([filters, search], () => void reload())

const groups = ref<string[]>([])
function loadGroups(): void {
  guestsService.groups().then((g) => (groups.value = g), () => {})
}
loadGroups()

const guests = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.meta.summary)
const hasFilters = computed(() => !!(filters.rsvp || filters.invitation || filters.group || search.value))

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Group', key: 'groupName', width: 140 },
  { title: 'Invitation', key: 'invitationStatus', width: 130 },
  { title: 'RSVP', key: 'rsvpStatus', width: 170 },
  { title: 'People', key: 'numberOfGuests', align: 'end' as const, width: 90 },
  { title: 'Meal', key: 'mealPreference', width: 140 },
]

const formOpen = ref(false)
const editing = ref<Guest | null>(null)

function openNew(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(guest: Guest): void {
  editing.value = guest
  formOpen.value = true
}
function refresh(): void {
  void reload()
  loadGroups()
}

/** Quick RSVP change straight from the list. */
async function setRsvp(guest: Guest, rsvpStatus: RsvpStatus): Promise<void> {
  if (guest.rsvpStatus === rsvpStatus) return
  try {
    await guestsService.update(guest.id, { rsvpStatus })
    notify.success(`${guest.name}: ${RSVP_STATUS[rsvpStatus].label}`)
    void reload()
  } catch (err) {
    notify.error(err)
  }
}

const rsvpOptions = Object.keys(RSVP_STATUS) as RsvpStatus[]
</script>

<template>
  <div>
    <PageHeader title="Guests">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Add guest</v-btn>
      </template>
    </PageHeader>

    <v-row v-if="summary" dense class="mb-3">
      <v-col cols="6" sm="4" md>
        <StatCard label="Total" :value="summary.total" :sub="`${summary.entries} invitations`" icon="mdi-account-group-outline" />
      </v-col>
      <v-col cols="6" sm="4" md>
        <StatCard label="Invited" :value="summary.invited" icon="mdi-email-outline" color="primary" />
      </v-col>
      <v-col cols="4" sm="4" md>
        <StatCard label="Attending" :value="summary.attending" color="success" />
      </v-col>
      <v-col cols="4" sm="6" md>
        <StatCard label="Pending" :value="summary.pending" color="warning" />
      </v-col>
      <v-col cols="4" sm="6" md>
        <StatCard label="Declined" :value="summary.declined" color="error" />
      </v-col>
    </v-row>

    <div class="d-flex flex-wrap align-center gap-2 mb-3">
      <v-text-field
        v-model="searchInput"
        placeholder="Search by name, phone or email"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        inputmode="search"
        class="flex-grow-1"
        style="min-width: 220px; max-width: 400px"
      />
      <v-select
        v-model="filters.group"
        :items="groups"
        label="Group"
        density="compact"
        hide-details
        clearable
        style="max-width: 180px; min-width: 130px"
      />
      <v-select
        v-model="filters.rsvp"
        :items="selectItems(RSVP_STATUS)"
        label="RSVP"
        density="compact"
        hide-details
        clearable
        style="max-width: 160px; min-width: 120px"
      />
      <v-select
        v-model="filters.invitation"
        :items="selectItems(INVITATION_STATUS)"
        label="Invitation"
        density="compact"
        hide-details
        clearable
        style="max-width: 170px; min-width: 130px"
      />
    </div>

    <ErrorState v-if="error" message="Couldn't load the guest list." @retry="reload" />
    <LoadingState v-else-if="!data" />
    <EmptyState
      v-else-if="guests.length === 0 && !hasFilters"
      icon="mdi-account-heart-outline"
      title="No guests yet"
      message="Start your guest list — family first?"
      action-text="Add guest"
      @action="openNew"
    />
    <EmptyState v-else-if="guests.length === 0" icon="mdi-magnify" title="No matching guests" />

    <DataTable v-else :headers="headers" :items="guests" :loading="loading" @click="openEdit">
      <template #[`item.name`]="{ item }">
        <div class="py-2">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div v-if="item.relationship" class="text-caption text-medium-emphasis">{{ item.relationship }}</div>
        </div>
      </template>
      <template #[`item.groupName`]="{ item }">{{ item.groupName ?? '—' }}</template>
      <template #[`item.invitationStatus`]="{ item }"><StatusChip :meta="INVITATION_STATUS[item.invitationStatus]" /></template>
      <template #[`item.rsvpStatus`]="{ item }">
        <v-menu>
          <template #activator="{ props }">
            <v-chip
              v-bind="props"
              :color="RSVP_STATUS[item.rsvpStatus].color"
              size="small"
              variant="tonal"
              label
              append-icon="mdi-menu-down"
              :aria-label="`RSVP for ${item.name}: ${RSVP_STATUS[item.rsvpStatus].label}. Change`"
              @click.stop
            >
              {{ RSVP_STATUS[item.rsvpStatus].label }}
            </v-chip>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="option in rsvpOptions"
              :key="option"
              :title="RSVP_STATUS[option].label"
              :active="option === item.rsvpStatus"
              @click="setRsvp(item, option)"
            />
          </v-list>
        </v-menu>
      </template>
      <template #[`item.mealPreference`]="{ item }">{{ item.mealPreference ?? '—' }}</template>

      <template #card="{ item }">
        <div class="pa-3">
          <div class="d-flex align-start justify-space-between gap-2">
            <div style="min-width: 0">
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ [item.groupName, item.relationship].filter(Boolean).join(' · ') || 'No group' }}
              </div>
            </div>
            <v-chip size="small" variant="outlined" label class="flex-shrink-0">
              <v-icon icon="mdi-account-multiple-outline" start size="small" />{{ item.numberOfGuests }}
            </v-chip>
          </div>
          <div class="d-flex flex-wrap align-center gap-2 mt-2">
            <StatusChip :meta="INVITATION_STATUS[item.invitationStatus]" />
            <StatusChip :meta="RSVP_STATUS[item.rsvpStatus]" />
            <span v-if="item.mealPreference" class="text-caption text-medium-emphasis">{{ item.mealPreference }}</span>
          </div>
        </div>
      </template>
    </DataTable>

    <GuestForm v-model="formOpen" :guest="editing" :groups="groups" @saved="refresh" @deleted="refresh" />
  </div>
</template>
