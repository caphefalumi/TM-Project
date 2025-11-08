import vue3GoogleLogin from 'vue3-google-login'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const CLIENT_ID = config.public.clientId

  nuxtApp.vueApp.use(vue3GoogleLogin, {
    clientId: CLIENT_ID,
  })
})
