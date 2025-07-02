import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../client/auth/Login.vue'
import Register from '../client/auth/Register.vue'
import HomeView from '../client/HomeView.vue'
import SideBar from '../client/components/Sidebar.vue'
import NewTeams from '../client/components/NewTeams.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Login, meta: { requiresAuth: false } },
    { path: '/register', component: Register, meta: { requiresAuth: false } },
    { path: '/home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/teams', component: HomeView, meta: { requiresAuth: true } },
    { path: '/inbox', component: HomeView, meta: { requiresAuth: true } },
    { path: '/about', component: HomeView, meta: { requiresAuth: true } },
  ]
})

router.beforeEach(async (to, from, next) => {
  // Check if route requires authentication
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    try {
      // Verify access token
      const PORT = import.meta.env.VITE_API_PORT
      const response = await fetch(`http://localhost:${PORT}/api/protected`, {
        method: 'GET',
        credentials: 'include',
      })
      if (response.ok) {
        next()
      } else {
        const response = await fetch(`http://localhost:${PORT}/api/tokens/access`, {
          method: 'GET',
          credentials: 'include',
        })
        console.log('Renew Access Token:', response.ok)
        if (response.ok) {
          next()
        } else {
          // Access token is invalid or expired
          console.error('Access token is invalid or expired')
          next('/') // Redirect to login
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      next('/')
    }
  } else {
    // Route doesn't require auth
    next()
  }
})

export default router
