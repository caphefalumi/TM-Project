import { createRouter, createWebHistory } from 'vue-router'
import Login from '../auth/Login.vue'
import Register from '../auth/Register.vue'
import ForgotPassword from '../auth/ForgotPassword.vue'
import ResetPassword from '../auth/ResetPassword.vue'
import TeamsView from '../views/TeamsView.vue'
import TeamDetails from '../views/TeamDetails.vue'
import Dashboard from '../views/Dashboard.vue'
import AdminView from '../views/AdminView.vue'
import LandingView from '../views/LandingView.vue'
import AccountPersonalView from '../views/AccountPersonalView.vue'
import AccountSecurityView from '../views/AccountSecurityView.vue'
import VerifyEmailView from '../views/VerifyEmailView.vue'
import AuthStore from '../scripts/authStore.js'
import AboutView from '../views/AboutView.vue'

const { getUserByAccessToken } = AuthStore

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: LandingView, meta: { requiresAuth: false } },
    { path: '/landing', component: LandingView, meta: { requiresAuth: false } },
    { path: '/login', component: Login, meta: { requiresAuth: false } },
    { path: '/register', component: Register, meta: { requiresAuth: false } },
    { path: '/forgot-password', component: ForgotPassword, meta: { requiresAuth: false } },
    { path: '/reset-password', component: ResetPassword, meta: { requiresAuth: false } },
    { path: '/verify-email', component: VerifyEmailView, meta: { requiresAuth: false } },
    { path: '/teams', component: TeamsView, meta: { requiresAuth: true } },
    { path: '/teams/:teamId', component: TeamDetails, meta: { requiresAuth: true } },
    { path: '/about', component: AboutView, meta: { requiresAuth: true } },
    { path: '/home', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/account/personal', component: AccountPersonalView, meta: { requiresAuth: true } },
    { path: '/account/security', component: AccountSecurityView, meta: { requiresAuth: true } },
    { path: '/account', redirect: '/account/personal' },
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
