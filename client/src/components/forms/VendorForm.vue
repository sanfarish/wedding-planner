<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Vendor, VendorDetail } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import MoneyField from '@/components/MoneyField.vue'
import StatusChip from '@/components/StatusChip.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useMoney } from '@/composables/useMoney'
import { useNotify } from '@/composables/useNotify'
import { vendorsService, type VendorInput } from '@/services/vendors'
import { EXPENSE_STATUS, selectItems, VENDOR_STATUS } from '@/utils/labels'
import { email, httpUrl, maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ vendor: Vendor | null; categories: string[] }>()
const emit = defineEmits<{ saved: [vendor: Vendor]; deleted: [id: number] }>()

const notify = useNotify()
const { money } = useMoney()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

function empty(): VendorInput {
  return {
    name: '',
    category: null,
    contactName: null,
    phone: null,
    email: null,
    website: null,
    quotedAmount: 0,
    status: 'considering',
    notes: null,
  }
}

const form = reactive<VendorInput>(empty())
const detail = ref<VendorDetail | null>(null)

const whatsappUrl = computed(() => {
  const digits = form.phone?.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
})

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  detail.value = null
  const v = props.vendor
  Object.assign(
    form,
    v
      ? {
          name: v.name,
          category: v.category,
          contactName: v.contactName,
          phone: v.phone,
          email: v.email,
          website: v.website,
          quotedAmount: v.quotedAmount,
          status: v.status,
          notes: v.notes,
        }
      : empty(),
  )
  if (v) vendorsService.detail(v.id).then((d) => (detail.value = d), () => {})
})

async function save(): Promise<void> {
  const saved = await run(() =>
    props.vendor ? vendorsService.update(props.vendor.id, { ...form }) : vendorsService.create({ ...form }),
  )
  if (!saved) return
  notify.success(props.vendor ? 'Vendor updated' : 'Vendor added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const vendor = props.vendor
  if (!vendor) return
  const linked = detail.value?.expenses.length ?? 0
  const extra = linked ? `Its ${linked} linked expense(s) will be kept without a vendor.` : undefined
  if (!(await confirmDelete(vendor.name, extra))) return
  const ok = await run(async () => {
    await vendorsService.remove(vendor.id)
    return true
  })
  if (!ok) return
  notify.success('Vendor deleted')
  emit('deleted', vendor.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="vendor ? vendor.name : 'New vendor'"
    :saving="saving"
    :error="error"
    :delete-text="vendor ? 'Delete' : undefined"
    @submit="save"
    @delete="remove"
  >
    <v-row dense>
      <v-col cols="12" sm="7">
        <v-text-field
          v-model="form.name"
          label="Vendor name"
          :rules="[required, maxLength(150)]"
          :error-messages="errorsFor('name')"
          :autofocus="!vendor"
        />
      </v-col>
      <v-col cols="12" sm="5">
        <v-combobox
          v-model="form.category"
          :items="categories"
          label="Category"
          placeholder="e.g. Photography"
          :rules="[maxLength(100)]"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.status" :items="selectItems(VENDOR_STATUS)" label="Status" />
      </v-col>
      <v-col cols="12" sm="6">
        <MoneyField v-model="form.quotedAmount" label="Quoted price" :error-messages="errorsFor('quotedAmount')" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.contactName" label="Contact person" :rules="[maxLength(150)]" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.phone" label="Phone" type="tel" inputmode="tel" :rules="[maxLength(50)]" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.email"
          label="Email"
          type="email"
          inputmode="email"
          :rules="[email]"
          :error-messages="errorsFor('email')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.website"
          label="Website"
          type="url"
          inputmode="url"
          placeholder="https://"
          :rules="[httpUrl]"
          :error-messages="errorsFor('website')"
        />
      </v-col>
    </v-row>
    <v-textarea v-model="form.notes" label="Notes" rows="2" :rules="[maxLength(5000)]" />

    <div v-if="vendor && (form.phone || form.website)" class="d-flex flex-wrap gap-2 mb-4">
      <v-btn v-if="form.phone" :href="`tel:${form.phone}`" size="small" variant="tonal" prepend-icon="mdi-phone">Call</v-btn>
      <v-btn
        v-if="whatsappUrl"
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="tonal"
        prepend-icon="mdi-whatsapp"
      >
        WhatsApp
      </v-btn>
      <v-btn
        v-if="form.website && httpUrl(form.website) === true"
        :href="form.website"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="tonal"
        prepend-icon="mdi-open-in-new"
      >
        Website
      </v-btn>
    </div>

    <template v-if="detail">
      <div class="text-subtitle-2 font-weight-bold mb-1">Linked expenses</div>
      <div v-if="detail.expenses.length === 0" class="text-body-2 text-medium-emphasis mb-2">
        None yet. Link expenses to this vendor from the Budget page.
      </div>
      <v-list v-else density="compact" class="pa-0 bg-transparent">
        <v-list-item v-for="e in detail.expenses" :key="e.id" class="px-0">
          <v-list-item-title>{{ e.description }}</v-list-item-title>
          <v-list-item-subtitle class="tabular-nums">
            {{ money(e.actualAmount) }} paid of {{ money(e.estimatedAmount) }}
          </v-list-item-subtitle>
          <template #append><StatusChip :meta="EXPENSE_STATUS[e.status]" /></template>
        </v-list-item>
      </v-list>
      <div v-if="detail.expenses.length" class="text-body-2 mt-2 tabular-nums">
        Total: <strong>{{ money(detail.expenseTotals.paid) }}</strong> paid of {{ money(detail.expenseTotals.estimated) }}
      </div>
    </template>
  </FormDialog>
</template>
