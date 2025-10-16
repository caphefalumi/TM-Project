import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

// Frequently used components - eagerly loaded for better performance
import LandingView from '../views/LandingView.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import TeamsView from '../views/TeamsView.vue'
import TeamDetails from '../views/TeamDetails.vue'
import Dashboard from '../views/Dashboard.vue'
import FeedbackView from '../views/FeedbackView.vue'
import AboutView from '../views/AboutView.vue'
import NotFound from '../views/NotFound.vue'
import PrivacyPolicyView from '../views/PrivacyPolicyView.vue'
import TermsOfServiceView from '../views/TermsOfServiceView.vue'

// Lazy-loaded components for less frequently accessed routes
const ForgotPassword = () => import('../views/ForgotPassword.vue')
const ResetPassword = () => import('../views/ResetPassword.vue')
const VerifyEmailView = () => import('../views/VerifyEmailView.vue')
const AdminView = () => import('../views/AdminView.vue')
const AccountPersonalView = () => import('../views/AccountPersonalView.vue')
const AccountSecurityView = () => import('../views/AccountSecurityView.vue')

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
      name: 'TeamDetails',
      component: TeamDetails,
      meta: { requiresAuth: true, title: 'Team Details' },
    },
    { path: '/about', component: AboutView, meta: { title: 'About' } },
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
      component: FeedbackView,
      meta: { title: 'Feedback' },
    },
    {
      path: '/privacy-policy',
      component: PrivacyPolicyView,
      meta: { requiresAuth: false, title: 'Privacy Policy' },
    },
    {
      path: '/terms-of-service',
      component: TermsOfServiceView,
      meta: { requiresAuth: false, title: 'Terms of Service' },
    },
    {
      path: '/NotFound',
      component: NotFound,
      meta: { requiresAuth: false, title: '404 Not Found' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: NotFound,
      meta: { requiresAuth: false, title: '404 Not Found' },
    },
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
  const authStore = useAuthStore()

  // Skip auth check if only query params changed (same route, e.g., tab changes)
  if (to.path === from.path && to.name === from.name) {
    next()
    return
  }

  if (!requiresAuth && !redirectIfAuthenticated) {
    next()
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
        next('/home')
        return
      }

      if (requiresAdmin) {
        if (user.username === 'admin') {
          console.log('Admin access granted')
          next()
        } else {
          console.log('Access denied: Admin privileges required')
          next('/home')
        }
        return
      }

      next()
      return
    }

    if (requiresAuth) {
      authStore.clearAuth()
      console.log('Authentication failed, redirecting to login')
      next('/login')
    } else {
      next()
    }
  } catch (error) {
    console.log('Auth check failed:', error)
    next('/login')
  }
})

export default router
