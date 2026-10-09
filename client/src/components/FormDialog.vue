<script setup lang="ts">
import { ref, useId } from 'vue'
import { useDisplay } from 'vuetify'
import type { VForm } from 'vuetify/components'

/**
 * Dialog wrapper for create/edit forms. Fullscreen on phones.
 * Emits `submit` only after client-side validation passes.
 */
const open = defineModel<boolean>({ required: true })
withDefaults(
  defineProps<{
    title: string
    saving?: boolean
    error?: string | null
    submitText?: string
    deleteText?: string
    maxWidth?: number
  }>(),
  { submitText: 'Save', maxWidth: 640 },
)
const emit = defineEmits<{ submit: []; delete: [] }>()

const { smAndDown } = useDisplay()
const form = ref<VForm>()
const formId = `form-${useId()}`

async function onSubmit(): Promise<void> {
  const result = await form.value?.validate()
  if (result?.valid) emit('submit')
}
</script>

<template>
  <v-dialog v-model="open" :fullscreen="smAndDown" :max-width="maxWidth" scrollable>
    <v-card :rounded="smAndDown ? 0 : 'lg'">
      <v-card-title class="d-flex align-center pt-4 px-5">
        <span class="text-h5 font-heading text-wrap">{{ title }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="open = false" />
      </v-card-title>

      <v-card-text class="px-5 pt-2">
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
        <v-form :id="formId" ref="form" @submit.prevent="onSubmit">
          <slot />
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="px-5 py-3">
        <v-btn v-if="deleteText" color="error" variant="text" prepend-icon="mdi-delete-outline" @click="emit('delete')">
          {{ deleteText }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn type="submit" :form="formId" color="primary" variant="flat" :loading="saving" min-width="96">
          {{ submitText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
