import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Scan every page up front so dev doesn't reload when a lazy page pulls in new Vuetify components.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.vue'],
  },
  server: {
    port: 5173,
    // Same-origin API in development, just like Nginx in production.
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
  },
})
