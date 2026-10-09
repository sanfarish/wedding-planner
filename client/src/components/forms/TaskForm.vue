<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Category, Task } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useNotify } from '@/composables/useNotify'
import { tasksService, type TaskInput } from '@/services/tasks'
import { useWeddingStore } from '@/stores/wedding'
import { selectItems, TASK_PRIORITY, TASK_STATUS } from '@/utils/labels'
import { maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ task: Task | null; categories: Category[] }>()
const emit = defineEmits<{ saved: [task: Task]; deleted: [id: number] }>()

const wedding = useWeddingStore()
const notify = useNotify()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

function empty(): TaskInput {
  return { title: '', description: null, status: 'todo', priority: 'medium', categoryId: null, dueDate: null, assignedTo: null }
}

const form = reactive<TaskInput>(empty())

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  const t = props.task
  Object.assign(
    form,
    t
      ? {
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          categoryId: t.categoryId,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo,
        }
      : empty(),
  )
})

const userItems = computed(() => [
  { title: 'Unassigned', value: null },
  ...wedding.users.map((u) => ({ title: u.displayName, value: u.id })),
])
const categoryItems = computed(() => props.categories.map((c) => ({ title: c.name, value: c.id })))

async function save(): Promise<void> {
  const input: TaskInput = { ...form, dueDate: form.dueDate || null }
  const saved = await run(() => (props.task ? tasksService.update(props.task.id, input) : tasksService.create(input)))
  if (!saved) return
  notify.success(props.task ? 'Task updated' : 'Task added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const task = props.task
  if (!task || !(await confirmDelete(task.title))) return
  const ok = await run(async () => {
    await tasksService.remove(task.id)
    return true
  })
  if (!ok) return
  notify.success('Task deleted')
  emit('deleted', task.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="task ? 'Edit task' : 'New task'"
    :saving="saving"
    :error="error"
    :delete-text="task ? 'Delete' : undefined"
    @submit="save"
    @delete="remove"
  >
    <v-text-field
      v-model="form.title"
      label="Task"
      placeholder="e.g. Book photographer"
      :rules="[required, maxLength(200)]"
      :error-messages="errorsFor('title')"
      autofocus
    />
    <v-textarea
      v-model="form.description"
      label="Details (optional)"
      rows="2"
      :rules="[maxLength(5000)]"
      :error-messages="errorsFor('description')"
    />
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.dueDate" label="Due date" type="date" clearable :error-messages="errorsFor('dueDate')" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.assignedTo" :items="userItems" label="Assigned to" :error-messages="errorsFor('assignedTo')" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.priority" :items="selectItems(TASK_PRIORITY)" label="Priority" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.status" :items="selectItems(TASK_STATUS)" label="Status" />
      </v-col>
      <v-col cols="12">
        <v-select
          v-model="form.categoryId"
          :items="categoryItems"
          label="Category"
          clearable
          :error-messages="errorsFor('categoryId')"
        />
      </v-col>
    </v-row>
  </FormDialog>
</template>
