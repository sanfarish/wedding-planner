<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Category, Expense, Vendor } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import MoneyField from '@/components/MoneyField.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useNotify } from '@/composables/useNotify'
import { budgetService, type ExpenseInput } from '@/services/budget'
import { useWeddingStore } from '@/stores/wedding'
import { EXPENSE_STATUS, selectItems } from '@/utils/labels'
import { maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ expense: Expense | null; categories: Category[]; vendors: Vendor[] }>()
const emit = defineEmits<{ saved: [expense: Expense]; deleted: [id: number] }>()

const wedding = useWeddingStore()
const notify = useNotify()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

function empty(): ExpenseInput {
  return {
    description: '',
    categoryId: null,
    vendorId: null,
    estimatedAmount: 0,
    actualAmount: 0,
    status: 'planned',
    paidBy: null,
    dueDate: null,
    notes: null,
  }
}

const form = reactive<ExpenseInput>(empty())

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  const e = props.expense
  Object.assign(
    form,
    e
      ? {
          description: e.description,
          categoryId: e.categoryId,
          vendorId: e.vendorId,
          estimatedAmount: e.estimatedAmount,
          actualAmount: e.actualAmount,
          status: e.status,
          paidBy: e.paidBy,
          dueDate: e.dueDate,
          notes: e.notes,
        }
      : empty(),
  )
})

// Marking as paid with nothing entered yet fills in the full estimate.
function onStatusChange(status: ExpenseInput['status']): void {
  if (status === 'paid' && form.actualAmount === 0) form.actualAmount = form.estimatedAmount
}

const categoryItems = computed(() => props.categories.map((c) => ({ title: c.name, value: c.id })))
const vendorItems = computed(() => props.vendors.map((v) => ({ title: v.name, value: v.id })))
const userItems = computed(() => [
  { title: 'Not paid yet', value: null },
  ...wedding.users.map((u) => ({ title: u.displayName, value: u.id })),
])

async function save(): Promise<void> {
  const input: ExpenseInput = { ...form, dueDate: form.dueDate || null }
  const saved = await run(() =>
    props.expense ? budgetService.expenses.update(props.expense.id, input) : budgetService.expenses.create(input),
  )
  if (!saved) return
  notify.success(props.expense ? 'Expense updated' : 'Expense added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const expense = props.expense
  if (!expense || !(await confirmDelete(expense.description))) return
  const ok = await run(async () => {
    await budgetService.expenses.remove(expense.id)
    return true
  })
  if (!ok) return
  notify.success('Expense deleted')
  emit('deleted', expense.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="expense ? 'Edit expense' : 'New expense'"
    :saving="saving"
    :error="error"
    :delete-text="expense ? 'Delete' : undefined"
    @submit="save"
    @delete="remove"
  >
    <v-text-field
      v-model="form.description"
      label="Description"
      placeholder="e.g. Venue deposit"
      :rules="[required, maxLength(200)]"
      :error-messages="errorsFor('description')"
      autofocus
    />
    <v-row dense>
      <v-col cols="12" sm="6">
        <MoneyField v-model="form.estimatedAmount" label="Estimated" :error-messages="errorsFor('estimatedAmount')" />
      </v-col>
      <v-col cols="12" sm="6">
        <MoneyField
          v-model="form.actualAmount"
          label="Actual (paid so far)"
          :error-messages="errorsFor('actualAmount')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.status"
          :items="selectItems(EXPENSE_STATUS)"
          label="Payment status"
          @update:model-value="onStatusChange"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.paidBy" :items="userItems" label="Paid by" :error-messages="errorsFor('paidBy')" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.categoryId"
          :items="categoryItems"
          label="Category"
          clearable
          :error-messages="errorsFor('categoryId')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.vendorId"
          :items="vendorItems"
          label="Vendor"
          clearable
          :no-data-text="'Add vendors on the Vendors page'"
          :error-messages="errorsFor('vendorId')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.dueDate" label="Due date" type="date" clearable :error-messages="errorsFor('dueDate')" />
      </v-col>
    </v-row>
    <v-textarea v-model="form.notes" label="Notes (optional)" rows="2" :rules="[maxLength(5000)]" />
  </FormDialog>
</template>
