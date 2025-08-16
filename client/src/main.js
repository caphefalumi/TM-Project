import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import 'vuetify/styles'
import vuetify from './plugins/vuetify.js' // Import the configured instance

import vue3GoogleLogin from 'vue3-google-login'

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID

const app = createApp(App)
const pinia = createPinia();

app.use(vue3GoogleLogin, {
  clientId: CLIENT_ID
})


app.use(router);
app.use(vuetify);
app.use(pinia);
app.mount('#app')
