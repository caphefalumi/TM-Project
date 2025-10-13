export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // Check if user is admin
  if (!authStore.isAdmin) {
    // Redirect to dashboard if not admin
    return navigateTo('/dashboard')
  }
})
