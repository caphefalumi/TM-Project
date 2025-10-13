export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // Check if route requires authentication
  const requiresAuth = to.meta.middleware?.includes('auth')

  if (requiresAuth && !authStore.isLoggedIn) {
    // Redirect to login if not authenticated
    return navigateTo('/login')
  }

  // Redirect to home if already logged in and trying to access login/register
  if (authStore.isLoggedIn && (to.path === '/login' || to.path === '/register' || to.path === '/')) {
    return navigateTo('/home')
  }
})
