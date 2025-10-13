export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  // Check if user is admin
  if (!authStore.user || authStore.user.role !== 'admin') {
    // Redirect to dashboard if not admin
    return navigateTo('/dashboard')
  }
})
