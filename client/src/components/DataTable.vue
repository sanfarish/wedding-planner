<script setup lang="ts" generic="T extends { id: number }">
import { computed, useSlots } from 'vue'
import { useDisplay } from 'vuetify'

/**
 * A table on desktop that turns into a list of cards on phones.
 *   - `item.<key>` slots customise desktop cells (same as v-data-table)
 *   - the `card` slot renders each item on mobile
 */
const props = defineProps<{
  headers: { title: string; key: string; align?: 'start' | 'end' | 'center'; sortable?: boolean; width?: string | number }[]
  items: T[]
  loading?: boolean
  rowClass?: (item: T) => string | undefined
}>()
const emit = defineEmits<{ click: [item: T] }>()

defineSlots<{
  card(props: { item: T }): unknown
  [key: `item.${string}`]: (props: { item: T; value: unknown }) => unknown
}>()

const slots = useSlots()
const { mdAndUp } = useDisplay()

const cellSlots = computed(() => Object.keys(slots).filter((name) => name.startsWith('item.')) as `item.${string}`[])
const perPage = computed(() => (props.items.length > 50 ? 50 : -1))
</script>

<template>
  <v-card v-if="mdAndUp">
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      :items-per-page="perPage"
      :hide-default-footer="items.length <= 50"
      :row-props="({ item }: { item: T }) => ({ class: rowClass?.(item) })"
      hover
      @click:row="(_event: unknown, row: { item: T }) => emit('click', row.item)"
    >
      <template v-for="name in cellSlots" :key="name" #[name]="cell">
        <slot :name="name" v-bind="cell" />
      </template>
    </v-data-table>
  </v-card>

  <div v-else>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" rounded />
    <v-card
      v-for="item in items"
      :key="item.id"
      class="mb-3 clickable-card"
      :class="rowClass?.(item)"
      @click="emit('click', item)"
    >
      <slot name="card" :item="item" />
    </v-card>
  </div>
</template>
