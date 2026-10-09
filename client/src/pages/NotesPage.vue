<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Note } from '@wedding/shared'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import NoteForm from '@/components/forms/NoteForm.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useDebounced } from '@/composables/useDebounced'
import { notesService } from '@/services/notes'
import { relativeTime } from '@/utils/dates'

const search = useDebounced('')
const searchInput = ref('')
watch(searchInput, (v) => (search.value = v))

const { data, error, reload } = useAsyncData(() => notesService.list({ search: search.value }).then((r) => r.data))
watch(search, () => void reload())

const notes = computed(() => data.value ?? [])

const formOpen = ref(false)
const editing = ref<Note | null>(null)

function openNew(): void {
  editing.value = null
  formOpen.value = true
}
function openEdit(note: Note): void {
  editing.value = note
  formOpen.value = true
}
</script>

<template>
  <div>
    <PageHeader title="Notes">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">New note</v-btn>
      </template>
    </PageHeader>

    <v-text-field
      v-model="searchInput"
      placeholder="Search notes"
      prepend-inner-icon="mdi-magnify"
      density="compact"
      hide-details
      clearable
      class="mb-4"
      style="max-width: 400px"
    />

    <ErrorState v-if="error" message="Couldn't load your notes." @retry="reload" />
    <LoadingState v-else-if="!data" />
    <EmptyState
      v-else-if="notes.length === 0 && !search"
      icon="mdi-note-text-outline"
      title="No notes yet"
      message="Jot down ideas, questions for vendors, or anything you want to remember."
      action-text="New note"
      @action="openNew"
    />
    <EmptyState v-else-if="notes.length === 0" icon="mdi-magnify" title="No matching notes" />

    <v-row v-else dense>
      <v-col v-for="note in notes" :key="note.id" cols="12" sm="6" lg="4">
        <v-card class="h-100 clickable-card d-flex flex-column" @click="openEdit(note)">
          <v-card-title class="text-subtitle-1 font-weight-bold text-wrap pb-1">{{ note.title }}</v-card-title>
          <v-card-text class="flex-grow-1 pb-2">
            <div class="pre-wrap text-body-2 note-preview">{{ note.content || 'Empty note' }}</div>
          </v-card-text>
          <v-card-text class="pt-0 text-caption text-medium-emphasis">
            {{ note.createdByName }} · updated {{ relativeTime(note.updatedAt) }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <NoteForm v-model="formOpen" :note="editing" @saved="reload" @deleted="reload" />
  </div>
</template>

<style scoped>
.note-preview {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
