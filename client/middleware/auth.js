export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // Check if the route requires authentication
  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !authStore.isLoggedIn) {
    // Redirect to login if not authenticated
    return navigateTo('/login')
  }

  // If already logged in and trying to access login/register, redirect to dashboard
  if ((to.path === '/login' || to.path === '/register') && authStore.isLoggedIn) {
    return navigateTo('/dashboard')
  }
})
