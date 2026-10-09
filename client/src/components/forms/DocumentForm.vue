<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { DocumentLink } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useNotify } from '@/composables/useNotify'
import { documentsService, type DocumentInput } from '@/services/documents'
import { httpUrl, maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ document: DocumentLink | null; categories: string[] }>()
const emit = defineEmits<{ saved: [document: DocumentLink]; deleted: [id: number] }>()

const notify = useNotify()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

function empty(): DocumentInput {
  return { title: '', description: null, url: '', category: null }
}

const form = reactive<DocumentInput>(empty())

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  const d = props.document
  Object.assign(form, d ? { title: d.title, description: d.description, url: d.url ?? '', category: d.category } : empty())
})

async function save(): Promise<void> {
  const input: DocumentInput = { ...form, url: form.url.trim() }
  const saved = await run(() =>
    props.document ? documentsService.update(props.document.id, input) : documentsService.create(input),
  )
  if (!saved) return
  notify.success(props.document ? 'Link updated' : 'Link added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const document = props.document
  if (!document || !(await confirmDelete(document.title))) return
  const ok = await run(async () => {
    await documentsService.remove(document.id)
    return true
  })
  if (!ok) return
  notify.success('Link deleted')
  emit('deleted', document.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="document ? 'Edit link' : 'New document link'"
    :saving="saving"
    :error="error"
    :delete-text="document ? 'Delete' : undefined"
    @submit="save"
    @delete="remove"
  >
    <v-text-field
      v-model="form.title"
      label="Title"
      placeholder="e.g. Venue contract"
      :rules="[required, maxLength(200)]"
      :error-messages="errorsFor('title')"
      autofocus
    />
    <v-text-field
      v-model="form.url"
      label="Link"
      type="url"
      inputmode="url"
      placeholder="https://drive.google.com/…"
      :rules="[required, httpUrl]"
      :error-messages="errorsFor('url')"
    />
    <v-combobox
      v-model="form.category"
      :items="categories"
      label="Category"
      placeholder="e.g. Contract, Quotation, Design"
      :rules="[maxLength(100)]"
    />
    <v-textarea v-model="form.description" label="Description (optional)" rows="2" :rules="[maxLength(2000)]" />
  </FormDialog>
</template>
