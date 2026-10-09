<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Note } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useNotify } from '@/composables/useNotify'
import { notesService, type NoteInput } from '@/services/notes'
import { maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ note: Note | null }>()
const emit = defineEmits<{ saved: [note: Note]; deleted: [id: number] }>()

const notify = useNotify()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

const form = reactive<NoteInput>({ title: '', content: null })

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  Object.assign(form, props.note ? { title: props.note.title, content: props.note.content } : { title: '', content: null })
})

async function save(): Promise<void> {
  const saved = await run(() => (props.note ? notesService.update(props.note.id, { ...form }) : notesService.create({ ...form })))
  if (!saved) return
  notify.success(props.note ? 'Note saved' : 'Note added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const note = props.note
  if (!note || !(await confirmDelete(note.title))) return
  const ok = await run(async () => {
    await notesService.remove(note.id)
    return true
  })
  if (!ok) return
  notify.success('Note deleted')
  emit('deleted', note.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="note ? 'Edit note' : 'New note'"
    :saving="saving"
    :error="error"
    :delete-text="note ? 'Delete' : undefined"
    :max-width="760"
    @submit="save"
    @delete="remove"
  >
    <v-text-field
      v-model="form.title"
      label="Title"
      placeholder="e.g. Questions for the venue"
      :rules="[required, maxLength(200)]"
      :error-messages="errorsFor('title')"
      :autofocus="!note"
    />
    <v-textarea
      v-model="form.content"
      label="Note"
      rows="10"
      max-rows="24"
      :rules="[maxLength(50000)]"
      :error-messages="errorsFor('content')"
    />
  </FormDialog>
</template>
