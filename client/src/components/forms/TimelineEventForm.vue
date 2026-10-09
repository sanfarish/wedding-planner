<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { TimelineEvent } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useNotify } from '@/composables/useNotify'
import { timelineService, type TimelineEventInput } from '@/services/timeline'
import { maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ event: TimelineEvent | null; defaultDate?: string | null; categories: string[] }>()
const emit = defineEmits<{ saved: [event: TimelineEvent]; deleted: [id: number] }>()

const notify = useNotify()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

function empty(): TimelineEventInput {
  return {
    title: '',
    description: null,
    eventDate: props.defaultDate ?? '',
    startTime: null,
    endTime: null,
    location: null,
    category: null,
  }
}

const form = reactive<TimelineEventInput>(empty())

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  const e = props.event
  Object.assign(
    form,
    e
      ? {
          title: e.title,
          description: e.description,
          eventDate: e.eventDate,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          category: e.category,
        }
      : empty(),
  )
})

const endAfterStart = (v: unknown) => !v || !form.startTime || String(v) >= form.startTime || 'Must be after the start time'

async function save(): Promise<void> {
  const input: TimelineEventInput = { ...form, startTime: form.startTime || null, endTime: form.endTime || null }
  const saved = await run(() => (props.event ? timelineService.update(props.event.id, input) : timelineService.create(input)))
  if (!saved) return
  notify.success(props.event ? 'Event updated' : 'Event added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const event = props.event
  if (!event || !(await confirmDelete(event.title))) return
  const ok = await run(async () => {
    await timelineService.remove(event.id)
    return true
  })
  if (!ok) return
  notify.success('Event deleted')
  emit('deleted', event.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="event ? 'Edit event' : 'New event'"
    :saving="saving"
    :error="error"
    :delete-text="event ? 'Delete' : undefined"
    @submit="save"
    @delete="remove"
  >
    <v-text-field
      v-model="form.title"
      label="Title"
      placeholder="e.g. Send invitations, Ceremony"
      :rules="[required, maxLength(200)]"
      :error-messages="errorsFor('title')"
      autofocus
    />
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.eventDate"
          label="Date"
          type="date"
          :rules="[required]"
          :error-messages="errorsFor('eventDate')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-combobox
          v-model="form.category"
          :items="categories"
          label="Category"
          placeholder="e.g. Milestone, Ceremony"
          :rules="[maxLength(100)]"
        />
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model="form.startTime"
          label="Start time"
          type="time"
          clearable
          :error-messages="errorsFor('startTime')"
        />
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model="form.endTime"
          label="End time"
          type="time"
          clearable
          :rules="[endAfterStart]"
          :error-messages="errorsFor('endTime')"
        />
      </v-col>
      <v-col cols="12">
        <v-text-field v-model="form.location" label="Location" :rules="[maxLength(200)]" />
      </v-col>
    </v-row>
    <v-textarea v-model="form.description" label="Details (optional)" rows="2" :rules="[maxLength(5000)]" />
  </FormDialog>
</template>
