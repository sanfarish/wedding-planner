<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MOBILE_PRIMARY, NAV_ITEMS } from '@/layouts/navigation'

const emit = defineEmits<{ more: [] }>()
const route = useRoute()

const primary = NAV_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.to.name))
const onSecondaryPage = computed(() => !MOBILE_PRIMARY.includes(String(route.name)))
</script>

<template>
  <v-bottom-navigation grow color="primary" bg-color="surface" border="t" elevation="0" height="64">
    <v-btn v-for="item in primary" :key="item.title" :to="item.to" :aria-label="item.title">
      <v-icon :icon="item.icon" />
      <span class="text-caption">{{ item.title }}</span>
    </v-btn>
    <v-btn :active="onSecondaryPage" aria-label="More pages" @click="emit('more')">
      <v-icon icon="mdi-dots-horizontal-circle-outline" />
      <span class="text-caption">More</span>
    </v-btn>
  </v-bottom-navigation>
</template>
