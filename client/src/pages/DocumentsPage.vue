<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DocumentLink } from '@wedding/shared'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import DocumentForm from '@/components/forms/DocumentForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useDebounced } from '@/composables/useDebounced'
import { documentsService } from '@/services/documents'
import { localDateOf, formatDate } from '@/utils/dates'

const search = useDebounced('')
const searchInput = ref('')
watch(searchInput, (v) => (search.value = v))
const category = ref<string | null>(null)

const { data, error, reload } = useAsyncData(() =>
  documentsService.list({ search: search.value, category: category.value }).then((r) => r.data),
)
watch([search, category], () => void reload())

// Categories come from the unfiltered list so the filter keeps all options.
const allCategories = ref<string[]>([])
watch(
  data,
  (docs) => {
    if (!docs || search.value || category.value) return
    allCategories.value = [...new Set(docs.map((d) => d.category).filter((c): c is string => !!c))].sort()
  },
  { immediate: true },
)

const documents = computed(() => data.value ?? [])
const hasFilters = computed(() => !!(search.value || category.value))

function hostOf(url: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function iconFor(url: string | null): string {
  const host = hostOf(url)
  if (host.includes('docs.google.com') || host.includes('drive.google.com')) return 'mdi-google-drive'
  if (host.includes('dropbox')) return 'mdi-dropbox'
  if (host.includes('canva')) return 'mdi-palette-outline'
  if (url?.toLowerCase().endsWith('.pdf')) return 'mdi-file-pdf-box'
  return 'mdi-link-variant'
}

const formOpen = ref(false)
const editing = ref<DocumentLink | null>(null)

function openNew(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(doc: DocumentLink): void {
  editing.value = doc
  formOpen.value = true
}
</script>

<template>
  <div>
    <PageHeader title="Documents" subtitle="Contracts, quotations and useful links">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Add link</v-btn>
      </template>
    </PageHeader>

    <div class="d-flex flex-wrap align-center gap-2 mb-4">
      <v-text-field
        v-model="searchInput"
        placeholder="Search documents"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        class="flex-grow-1"
        style="min-width: 200px; max-width: 400px"
      />
      <v-select
        v-if="allCategories.length"
        v-model="category"
        :items="allCategories"
        label="Category"
        density="compact"
        hide-details
        clearable
        style="max-width: 200px; min-width: 140px"
      />
    </div>

    <ErrorState v-if="error" message="Couldn't load your documents." @retry="reload" />
    <LoadingState v-else-if="!data" />
    <EmptyState
      v-else-if="documents.length === 0 && !hasFilters"
      icon="mdi-file-link-outline"
      title="No documents yet"
      message="Save links to contracts, quotations, shared folders and designs."
      action-text="Add link"
      @action="openNew"
    />
    <EmptyState v-else-if="documents.length === 0" icon="mdi-magnify" title="No matching documents" />

    <v-card v-else>
      <v-list lines="two" class="py-0">
        <template v-for="(doc, index) in documents" :key="doc.id">
          <v-divider v-if="index > 0" />
          <v-list-item class="py-3" @click="openEdit(doc)">
            <template #prepend>
              <v-avatar color="surface-variant" rounded="lg">
                <v-icon :icon="iconFor(doc.url)" color="primary" />
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">{{ doc.title }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ [doc.category, hostOf(doc.url), `added ${formatDate(localDateOf(doc.createdAt))}`].filter(Boolean).join(' · ') }}
            </v-list-item-subtitle>
            <div v-if="doc.description" class="text-body-2 text-medium-emphasis mt-1">{{ doc.description }}</div>
            <template #append>
              <v-btn
                v-if="doc.url"
                :href="doc.url"
                target="_blank"
                rel="noopener noreferrer"
                icon="mdi-open-in-new"
                variant="text"
                color="primary"
                :aria-label="`Open ${doc.title}`"
                @click.stop
              />
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>

    <DocumentForm v-model="formOpen" :document="editing" :categories="allCategories" @saved="reload" @deleted="reload" />
  </div>
</template>
