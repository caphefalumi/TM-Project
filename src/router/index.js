import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../client/auth/Login.vue'
import Register from '../client/auth/Register.vue'
import TeamsView from '../client/TeamsView.vue'
import TeamDetails from '../client/views/TeamDetails.vue'
import Dashboard from '../client/views/Dashboard.vue'
import AdminView from '../client/views/AdminView.vue'
import AuthStore from '../client/scripts/authStore.js'

const { getUserByAccessToken } = AuthStore

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Login, meta: { requiresAuth: false } },
    { path: '/login', component: Login, meta: { requiresAuth: false } },
    { path: '/register', component: Register, meta: { requiresAuth: false } },
    { path: '/teams', component: TeamsView, meta: { requiresAuth: true } },
    { path: '/teams/:teamId', component: TeamDetails, meta: { requiresAuth: true } },
    { path: '/inbox', component: TeamsView, meta: { requiresAuth: true } },
    { path: '/about', component: TeamsView, meta: { requiresAuth: true } },
    { path: '/home', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/admin', component: AdminView, meta: { requiresAuth: true, requiresAdmin: true } },
  ],
})

router.beforeEach(async (to, from, next) => {
  // Check if route requires authentication
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    try {
      console.log(`Checking authentication for route: ${to.path}`)

      // Use the enhanced authStore that handles token refresh automatically
      const user = await getUserByAccessToken()
      console.log('User fetched from authStore:', user)
      if (user) {
        console.log('User authenticated successfully:', user.username)

        // Check if route requires admin access
        if (to.matched.some((record) => record.meta.requiresAdmin)) {
          if (user.username === 'admin') {
            console.log('Admin access granted')
            next()
          } else {
            console.error('Access denied: Admin privileges required')
            next('/home') // Redirect to home if not admin
          }
        } else {
          next()
        }
      } else {
        // Authentication failed (both access token and refresh token failed)
        console.error('Authentication failed, redirecting to login')
        next('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      next('/login')
    }
  } else {
    // Route doesn't require auth
    next()
  }
})

export default router
