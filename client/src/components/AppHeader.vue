<script setup lang="ts">
import { useLogout } from '@/composables/useLogout'
import { useAuthStore } from '@/stores/auth'
import { useWeddingStore } from '@/stores/wedding'
import UserAvatar from './UserAvatar.vue'

const auth = useAuthStore()
const wedding = useWeddingStore()
const logout = useLogout()
</script>

<template>
  <v-app-bar flat border="b" color="surface" density="comfortable">
    <router-link :to="{ name: 'dashboard' }" class="d-flex align-center text-decoration-none text-high-emphasis ml-4">
      <span class="text-h6 mr-2" aria-hidden="true">💍</span>
      <span class="text-h5 font-heading">{{ wedding.weddingName }}</span>
    </router-link>

    <v-spacer />

    <v-menu v-if="auth.user" location="bottom end">
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" class="mr-2 px-2" :aria-label="`Account menu for ${auth.user.displayName}`">
          <UserAvatar :user-id="auth.user.id" :name="auth.user.displayName" size="32" />
          <span class="ml-2 d-none d-sm-inline">{{ auth.user.displayName }}</span>
          <v-icon end icon="mdi-chevron-down" size="small" />
        </v-btn>
      </template>
      <v-list density="comfortable" min-width="200">
        <v-list-item :subtitle="`@${auth.user.username}`" :title="auth.user.displayName" />
        <v-divider class="my-1" />
        <v-list-item prepend-icon="mdi-cog-outline" title="Settings" :to="{ name: 'settings' }" />
        <v-list-item prepend-icon="mdi-logout" title="Log out" @click="logout" />
      </v-list>
    </v-menu>
  </v-app-bar>
</template>
