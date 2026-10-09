<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Guest } from '@wedding/shared'
import FormDialog from '@/components/FormDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useFormState } from '@/composables/useFormState'
import { useNotify } from '@/composables/useNotify'
import { guestsService, type GuestInput } from '@/services/guests'
import { INVITATION_STATUS, RSVP_STATUS, selectItems } from '@/utils/labels'
import { email, intBetween, maxLength, required } from '@/utils/rules'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ guest: Guest | null; groups: string[] }>()
const emit = defineEmits<{ saved: [guest: Guest]; deleted: [id: number] }>()

const notify = useNotify()
const { confirmDelete } = useConfirm()
const { saving, error, reset, run, errorsFor } = useFormState()

function empty(): GuestInput {
  return {
    name: '',
    phone: null,
    email: null,
    groupName: null,
    relationship: null,
    invitationStatus: 'not_invited',
    rsvpStatus: 'pending',
    numberOfGuests: 1,
    mealPreference: null,
    notes: null,
  }
}

const form = reactive<GuestInput>(empty())

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  const g = props.guest
  Object.assign(
    form,
    g
      ? {
          name: g.name,
          phone: g.phone,
          email: g.email,
          groupName: g.groupName,
          relationship: g.relationship,
          invitationStatus: g.invitationStatus,
          rsvpStatus: g.rsvpStatus,
          numberOfGuests: g.numberOfGuests,
          mealPreference: g.mealPreference,
          notes: g.notes,
        }
      : empty(),
  )
})

async function save(): Promise<void> {
  const input: GuestInput = { ...form, numberOfGuests: Number(form.numberOfGuests) }
  const saved = await run(() => (props.guest ? guestsService.update(props.guest.id, input) : guestsService.create(input)))
  if (!saved) return
  notify.success(props.guest ? 'Guest updated' : 'Guest added')
  emit('saved', saved)
  open.value = false
}

async function remove(): Promise<void> {
  const guest = props.guest
  if (!guest || !(await confirmDelete(guest.name))) return
  const ok = await run(async () => {
    await guestsService.remove(guest.id)
    return true
  })
  if (!ok) return
  notify.success('Guest removed')
  emit('deleted', guest.id)
  open.value = false
}
</script>

<template>
  <FormDialog
    v-model="open"
    :title="guest ? 'Edit guest' : 'New guest'"
    :saving="saving"
    :error="error"
    :delete-text="guest ? 'Delete' : undefined"
    @submit="save"
    @delete="remove"
  >
    <v-text-field
      v-model="form.name"
      label="Name"
      :rules="[required, maxLength(150)]"
      :error-messages="errorsFor('name')"
      autofocus
    />
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-select v-model="form.invitationStatus" :items="selectItems(INVITATION_STATUS)" label="Invitation" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.rsvpStatus" :items="selectItems(RSVP_STATUS)" label="RSVP" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-combobox
          v-model="form.groupName"
          :items="groups"
          label="Group / family"
          placeholder="e.g. Family, Friends, Work"
          :rules="[maxLength(100)]"
          :error-messages="errorsFor('groupName')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model.number="form.numberOfGuests"
          label="Number of people"
          type="number"
          min="1"
          max="20"
          hint="Including plus-ones and children"
          :rules="[intBetween(1, 20)]"
          :error-messages="errorsFor('numberOfGuests')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.relationship" label="Relationship" placeholder="e.g. Cousin" :rules="[maxLength(100)]" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.mealPreference" label="Meal preference" placeholder="e.g. Vegetarian" :rules="[maxLength(100)]" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.phone"
          label="Phone"
          type="tel"
          inputmode="tel"
          :rules="[maxLength(50)]"
          :error-messages="errorsFor('phone')"
        />
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
    </v-row>
    <v-textarea v-model="form.notes" label="Notes (optional)" rows="2" :rules="[maxLength(2000)]" />
  </FormDialog>
</template>
