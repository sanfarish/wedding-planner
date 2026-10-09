import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { router } from './router'
import { onUnauthorized } from './services/api'
import { useAuthStore } from './stores/auth'
import { useWeddingStore } from './stores/wedding'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

// When a session expires mid-use, send the user back to the login page.
onUnauthorized(() => {
  const auth = useAuthStore(pinia)
  if (!auth.user) return
  auth.clear()
  useWeddingStore(pinia).reset()
  const current = router.currentRoute.value
  if (!current.meta.public) void router.replace({ name: 'login', query: { redirect: current.fullPath } })
})

app.mount('#app')
