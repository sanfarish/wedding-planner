<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { VForm } from 'vuetify/components'
import MoneyField from '@/components/MoneyField.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useFormState } from '@/composables/useFormState'
import { useLogout } from '@/composables/useLogout'
import { useNotify } from '@/composables/useNotify'
import { authService } from '@/services/auth'
import type { WeddingSettingsInput } from '@/services/settings'
import { useAuthStore } from '@/stores/auth'
import { useWeddingStore } from '@/stores/wedding'
import { CURRENCIES, selectItems } from '@/utils/labels'
import { maxLength, minLength, required } from '@/utils/rules'

const auth = useAuthStore()
const wedding = useWeddingStore()
const notify = useNotify()
const logout = useLogout()

// ----- Wedding -----
const s = wedding.settings!
const weddingForm = reactive<Required<WeddingSettingsInput>>({
  weddingName: s.weddingName,
  weddingDate: s.weddingDate,
  weddingLocation: s.weddingLocation,
  groomName: s.groomName,
  brideName: s.brideName,
  currency: s.currency,
  totalBudget: s.totalBudget,
})
const weddingState = useFormState()
const weddingFormRef = ref<VForm>()

async function saveWedding(): Promise<void> {
  if (!(await weddingFormRef.value?.validate())?.valid) return
  const ok = await weddingState.run(async () => {
    await wedding.update({ ...weddingForm, weddingDate: weddingForm.weddingDate || null })
    return true
  })
  if (ok) notify.success('Wedding details saved')
}

// ----- Account -----
const displayName = ref(auth.user?.displayName ?? '')
const accountState = useFormState()
const accountFormRef = ref<VForm>()

async function saveDisplayName(): Promise<void> {
  if (!(await accountFormRef.value?.validate())?.valid) return
  const user = await accountState.run(() => authService.updateMe(displayName.value.trim()))
  if (!user) return
  auth.setUser(user)
  wedding.replaceUser(user)
  notify.success('Display name updated')
}

// ----- Password -----
const passwords = reactive({ current: '', next: '', confirm: '' })
const passwordState = useFormState()
const passwordFormRef = ref<VForm>()
const showPasswords = ref(false)
const matches = (v: unknown) => v === passwords.next || 'Passwords do not match'

async function changePassword(): Promise<void> {
  if (!(await passwordFormRef.value?.validate())?.valid) return
  const ok = await passwordState.run(async () => {
    await authService.changePassword(passwords.current, passwords.next)
    return true
  })
  if (!ok) return
  Object.assign(passwords, { current: '', next: '', confirm: '' })
  passwordFormRef.value?.resetValidation()
  notify.success('Password changed')
}
</script>

<template>
  <div>
    <PageHeader title="Settings" />

    <v-row>
      <v-col cols="12" lg="7">
        <v-card>
          <v-card-title class="text-h6 font-heading pt-4">Wedding</v-card-title>
          <v-card-text>
            <v-alert v-if="weddingState.error.value" type="error" variant="tonal" density="compact" class="mb-4">
              {{ weddingState.error.value }}
            </v-alert>
            <v-form ref="weddingFormRef" @submit.prevent="saveWedding">
              <v-row dense>
                <v-col cols="12">
                  <v-text-field
                    v-model="weddingForm.weddingName"
                    label="Wedding name"
                    :rules="[required, maxLength(100)]"
                    :error-messages="weddingState.errorsFor('weddingName')"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="weddingForm.weddingDate"
                    label="Wedding date"
                    type="date"
                    clearable
                    :error-messages="weddingState.errorsFor('weddingDate')"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="weddingForm.weddingLocation" label="Location" :rules="[maxLength(200)]" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="weddingForm.brideName" label="Bride's name" :rules="[maxLength(100)]" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="weddingForm.groomName" label="Groom's name" :rules="[maxLength(100)]" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select v-model="weddingForm.currency" :items="selectItems(CURRENCIES)" label="Currency" />
                </v-col>
                <v-col cols="12" sm="6">
                  <MoneyField
                    v-model="weddingForm.totalBudget"
                    label="Total budget"
                    :error-messages="weddingState.errorsFor('totalBudget')"
                  />
                </v-col>
              </v-row>
              <div class="d-flex justify-end">
                <v-btn type="submit" color="primary" :loading="weddingState.saving.value">Save wedding details</v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="mb-4">
          <v-card-title class="text-h6 font-heading pt-4">Account</v-card-title>
          <v-card-text>
            <v-alert v-if="accountState.error.value" type="error" variant="tonal" density="compact" class="mb-4">
              {{ accountState.error.value }}
            </v-alert>
            <v-form ref="accountFormRef" @submit.prevent="saveDisplayName">
              <v-text-field :model-value="auth.user?.username" label="Username" readonly disabled prepend-inner-icon="mdi-at" />
              <v-text-field
                v-model="displayName"
                label="Display name"
                :rules="[required, maxLength(50)]"
                :error-messages="accountState.errorsFor('displayName')"
              />
              <div class="d-flex justify-end">
                <v-btn type="submit" color="primary" variant="tonal" :loading="accountState.saving.value">Save name</v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title class="text-h6 font-heading pt-4">Change password</v-card-title>
          <v-card-text>
            <v-alert v-if="passwordState.error.value" type="error" variant="tonal" density="compact" class="mb-4">
              {{ passwordState.error.value }}
            </v-alert>
            <v-form ref="passwordFormRef" @submit.prevent="changePassword">
              <v-text-field
                v-model="passwords.current"
                label="Current password"
                :type="showPasswords ? 'text' : 'password'"
                autocomplete="current-password"
                :rules="[required]"
                :error-messages="passwordState.errorsFor('currentPassword')"
              />
              <v-text-field
                v-model="passwords.next"
                label="New password"
                :type="showPasswords ? 'text' : 'password'"
                autocomplete="new-password"
                hint="At least 10 characters"
                :rules="[required, minLength(10)]"
                :error-messages="passwordState.errorsFor('newPassword')"
              />
              <v-text-field
                v-model="passwords.confirm"
                label="Confirm new password"
                :type="showPasswords ? 'text' : 'password'"
                autocomplete="new-password"
                :rules="[required, matches]"
              />
              <div class="d-flex align-center justify-space-between">
                <v-checkbox v-model="showPasswords" label="Show passwords" density="compact" hide-details />
                <v-btn type="submit" color="primary" variant="tonal" :loading="passwordState.saving.value">
                  Change password
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <v-btn block variant="outlined" color="error" prepend-icon="mdi-logout" size="large" @click="logout">Log out</v-btn>
      </v-col>
    </v-row>
  </div>
</template>
