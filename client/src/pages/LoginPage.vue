<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { required } from '@/utils/rules'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

async function submit(): Promise<void> {
  if (!username.value.trim() || !password.value) return
  loading.value = true
  error.value = null
  try {
    await auth.login(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch (err) {
    password.value = ''
    if (err instanceof ApiError && (err.status === 401 || err.status === 429 || err.status === 0)) error.value = err.message
    else error.value = 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-main class="login-bg">
    <div class="d-flex align-center justify-center px-4" style="min-height: 100dvh">
      <div style="width: 100%; max-width: 400px">
        <div class="text-center mb-6">
          <div class="text-h3 mb-1" aria-hidden="true">💍</div>
          <h1 class="text-h3 font-heading">Our Wedding</h1>
          <div class="text-body-2 text-medium-emphasis mt-1">Our little planning space</div>
        </div>

        <v-card class="pa-2">
          <v-card-text>
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4" role="alert">
              {{ error }}
            </v-alert>

            <v-form @submit.prevent="submit">
              <v-text-field
                v-model="username"
                label="Username"
                autocomplete="username"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                prepend-inner-icon="mdi-account-outline"
                :rules="[required]"
                autofocus
                class="mb-2"
              />
              <v-text-field
                v-model="password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :rules="[required]"
                class="mb-2"
                @click:append-inner="showPassword = !showPassword"
              />
              <v-btn type="submit" color="primary" size="large" block :loading="loading" class="mt-2">
                Sign in
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </v-main>
</template>

<style scoped>
.login-bg {
  background:
    radial-gradient(circle at 15% 10%, rgba(201, 168, 106, 0.12), transparent 40%),
    radial-gradient(circle at 85% 90%, rgba(158, 107, 110, 0.12), transparent 45%),
    rgb(var(--v-theme-background));
}
</style>
