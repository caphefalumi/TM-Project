export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  const requiresAuth = to.meta.requiresAuth
  const requiresAdmin = to.meta.requiresAdmin
  const redirectIfAuthenticated = to.meta.redirectIfAuthenticated

  // Skip auth check if only query params changed (same route, e.g., tab changes)
  if (to.path === from.path && to.name === from.name) {
    return
  }

  if (!requiresAuth && !redirectIfAuthenticated) {
    return
  }

  try {
    console.log(`Checking authentication for route: ${to.path}`)
    const user = await authStore.ensureUser()
    console.log('User fetched from authStore:', user)

    if (user) {
      authStore.setUserFromApi(user)

      console.log('User authenticated successfully:', user.username)

      if (redirectIfAuthenticated) {
        console.log('Authenticated user attempting to access public route, redirecting to /home')
        return navigateTo('/home')
      }

      if (requiresAdmin) {
        if (user.username === 'admin') {
          console.log('Admin access granted')
          return
        } else {
          console.log('Access denied: Admin privileges required')
          return navigateTo('/home')
        }
      }

      return
    }

    if (requiresAuth) {
      authStore.clearAuth()
      console.log('Authentication failed, redirecting to login')
      return navigateTo('/login')
    }
  } catch (error) {
    console.log('Auth check failed:', error)
    return navigateTo('/login')
  }
})
