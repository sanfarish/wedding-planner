<script setup lang="ts">
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import MobileNav from '@/components/MobileNav.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { useWeddingStore } from '@/stores/wedding'

const { mdAndUp } = useDisplay()
const wedding = useWeddingStore()
const moreOpen = ref(false)

// Settings and users are needed by every page (names, currency, assignees).
const { loading, error, reload } = useAsyncData(() => wedding.load())
</script>

<template>
  <AppHeader />
  <AppSidebar v-if="mdAndUp" />
  <AppSidebar v-else v-model="moreOpen" temporary />

  <v-main>
    <div class="page-container pa-4 pa-md-6 pb-8">
      <ErrorState v-if="error" :message="error" @retry="reload" />
      <LoadingState v-else-if="loading || !wedding.loaded" />
      <router-view v-else />
    </div>
  </v-main>

  <MobileNav v-if="!mdAndUp" @more="moreOpen = true" />
</template>
