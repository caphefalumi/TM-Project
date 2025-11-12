import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/router'

import 'vuetify/styles'
import vuetify from './plugins/vuetify.js' // Import the configured instance

import vue3GoogleLogin from 'vue3-google-login'
import { initializeCsrf } from './services/csrfService.js'

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID

const app = createApp(App)
const pinia = createPinia()

app.use(vue3GoogleLogin, {
  clientId: CLIENT_ID,
})

app.use(pinia)
app.use(router)
app.use(vuetify)

// Initialize CSRF protection before mounting the app
initializeCsrf().then(() => {
  app.mount('#app')
})
