import { createRouter, createWebHistory } from 'vue-router'
import AuthStore from '../scripts/authStore.js'

// Frequently used components - eagerly loaded for better performance
import LandingView from '../views/LandingView.vue'
import Login from '../auth/Login.vue'
import Register from '../auth/Register.vue'
import TeamsView from '../views/TeamsView.vue'
import TeamDetails from '../views/TeamDetails.vue'
import Dashboard from '../views/Dashboard.vue'

const ForgotPassword = () => import('../auth/ForgotPassword.vue')
const ResetPassword = () => import('../auth/ResetPassword.vue')
const VerifyEmailView = () => import('../views/VerifyEmailView.vue')
const AdminView = () => import('../views/AdminView.vue')
const AccountPersonalView = () => import('../views/AccountPersonalView.vue')
const AccountSecurityView = () => import('../views/AccountSecurityView.vue')
const AboutView = () => import('../views/AboutView.vue')

const { getUserByAccessToken } = AuthStore

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: LandingView,
      meta: { requiresAuth: false, redirectIfAuthenticated: true, title: 'Teams Management' },
    },
    {
      path: '/landing',
      component: LandingView,
      meta: { requiresAuth: false, redirectIfAuthenticated: true, title: 'Teams Management' },
    },
    {
      path: '/login',
      component: Login,
      meta: { requiresAuth: false, redirectIfAuthenticated: true, title: 'Sign In' },
    },
    {
      path: '/register',
      component: Register,
      meta: { requiresAuth: false, redirectIfAuthenticated: true, title: 'Create Account' },
    },
    {
      path: '/forgot-password',
      component: ForgotPassword,
      meta: { requiresAuth: false, title: 'Forgot Password' },
    },
    {
      path: '/reset-password',
      component: ResetPassword,
      meta: { requiresAuth: false, title: 'Reset Password' },
    },
    {
      path: '/verify-email',
      component: VerifyEmailView,
      meta: { requiresAuth: false, title: 'Verify Email' },
    },
    { path: '/teams', component: TeamsView, meta: { requiresAuth: true, title: 'Teams' } },
    {
      path: '/teams/:teamId',
      component: TeamDetails,
      meta: { requiresAuth: true, title: 'Team Details' },
    },
    { path: '/about', component: AboutView, meta: { requiresAuth: true, title: 'About' } },
    { path: '/home', component: Dashboard, meta: { requiresAuth: true, title: 'Dashboard' } },
    {
      path: '/account/personal',
      component: AccountPersonalView,
      meta: { requiresAuth: true, title: 'Personal Information' },
    },
    {
      path: '/account/security',
      component: AccountSecurityView,
      meta: { requiresAuth: true, title: 'Security Settings' },
    },
    { path: '/account', redirect: '/account/personal' },
    {
      path: '/admin',
      component: AdminView,
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Admin Panel' },
    },
    {
      path: '/feedback',
      component: () => import('../views/FeedbackView.vue'),
      meta: { requiresAuth: true, title: 'Feedback' },
    }
  ],
})

const defaultTitle = 'Teams Management'

router.afterEach((to) => {
  const nearestWithTitle = [...to.matched].reverse().find((routeRecord) => routeRecord.meta?.title)
  const pageTitle = nearestWithTitle?.meta?.title

  if (pageTitle && pageTitle !== defaultTitle) {
    document.title = pageTitle || defaultTitle
  } else {
    document.title = defaultTitle
  }
})

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const redirectIfAuthenticated = to.matched.some((record) => record.meta.redirectIfAuthenticated)

  if (!requiresAuth && !redirectIfAuthenticated) {
    next()
    return
  }

  try {
    console.log(`Checking authentication for route: ${to.path}`)
    const user = await getUserByAccessToken()
    console.log('User fetched from authStore:', user)

    if (user) {
      console.log('User authenticated successfully:', user.username)

      if (redirectIfAuthenticated) {
        console.log('Authenticated user attempting to access public route, redirecting to /home')
        next('/home')
        return
      }

      if (requiresAdmin) {
        if (user.username === 'admin') {
          console.log('Admin access granted')
          next()
        } else {
          console.error('Access denied: Admin privileges required')
          next('/home')
        }
        return
      }

      next()
      return
    }

    if (requiresAuth) {
      console.error('Authentication failed, redirecting to login')
      next('/login')
    } else {
      next()
    }
  } catch (error) {
    console.error('Auth check failed:', error)
    next('/login')
  }
})

export default router
