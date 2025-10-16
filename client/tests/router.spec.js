/**
 * Router Guards Tests
 * Tests navigation guards, authentication checks, and route protection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/stores/auth.js'
import { createTestPinia, createMockUser, createMockAdmin, flushPromises } from './helpers.js'

// Mock AuthStore module
vi.mock('../src/scripts/authStore.js', () => ({
  default: {
    getUserByAccessToken: vi.fn(),
    logout: vi.fn(),
  },
}))

import AuthStore from '../src/scripts/authStore.js'

// Import actual routes for testing
import LandingView from '../src/views/LandingView.vue'
import Login from '../src/views/Login.vue'
import Register from '../src/views/Register.vue'
import Dashboard from '../src/views/Dashboard.vue'
import NotFound from '../src/views/NotFound.vue'

// Lazy-loaded components
const AdminView = () => import('../src/views/AdminView.vue')

describe('Router Guards', () => {
  let router
  let authStore

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create fresh pinia instance
    const pinia = createTestPinia()
    authStore = useAuthStore(pinia)

    // Create router with test routes
    router = createRouter({
      history: createMemoryHistory(),
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
          path: '/home',
          component: Dashboard,
          meta: { requiresAuth: true, title: 'Dashboard' },
        },
        {
          path: '/admin',
          component: AdminView,
          meta: { requiresAuth: true, requiresAdmin: true, title: 'Admin Panel' },
        },
        {
          path: '/:pathMatch(.*)*',
          component: NotFound,
          meta: { requiresAuth: false, title: '404 Not Found' },
        },
      ],
    })

    // Apply the same navigation guards as the actual router
    const defaultTitle = 'Teams Management'

    router.afterEach((to) => {
      const nearestWithTitle = [...to.matched]
        .reverse()
        .find((routeRecord) => routeRecord.meta?.title)
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
      const redirectIfAuthenticated = to.matched.some(
        (record) => record.meta.redirectIfAuthenticated,
      )

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
        const user = await authStore.ensureUser()

        if (user) {
          authStore.setUserFromApi(user)

          if (redirectIfAuthenticated) {
            next('/home')
            return
          }

          if (requiresAdmin) {
            if (user.username === 'admin') {
              next()
            } else {
              next('/home')
            }
            return
          }

          next()
          return
        }

        if (requiresAuth) {
          authStore.clearAuth()
          next('/login')
        } else {
          next()
        }
      } catch (error) {
        console.log('Auth check failed:', error)
        next('/login')
      }
    })

    await router.isReady()
  })

  describe('Public Routes - Redirect if Authenticated', () => {
    it('should redirect authenticated users from landing page to /home', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      // Act
      await router.push('/')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should redirect authenticated users from login page to /home', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      // Act
      await router.push('/login')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should redirect authenticated users from register page to /home', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      // Act
      await router.push('/register')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should allow unauthenticated users to access login page', async () => {
      // Arrange
      AuthStore.getUserByAccessToken.mockResolvedValue(null)
      authStore.clearAuth()

      // Act
      await router.push('/login')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('Protected Routes - Require Authentication', () => {
    it('should redirect unauthenticated users from /home to /login', async () => {
      // Arrange
      AuthStore.getUserByAccessToken.mockResolvedValue(null)
      authStore.clearAuth()

      // Act
      await router.push('/home')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/login')
      expect(authStore.isLoggedIn).toBe(false)
    })

    it('should allow authenticated users to access /home', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      // Act
      await router.push('/home')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
      expect(authStore.isLoggedIn).toBe(true)
    })

    it('should redirect to /login on authentication error', async () => {
      // Arrange
      AuthStore.getUserByAccessToken.mockRejectedValue(new Error('Auth failed'))
      authStore.clearAuth()

      // Act
      await router.push('/home')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('Admin-Only Routes', () => {
    it('should allow admin users to access /admin', async () => {
      // Arrange
      const mockAdmin = createMockAdmin()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockAdmin)
      authStore.setUserFromApi(mockAdmin)

      // Act
      await router.push('/admin')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/admin')
    })

    it('should redirect non-admin users from /admin to /home', async () => {
      // Arrange
      const mockUser = createMockUser({ username: 'regularuser' })
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      // Act
      await router.push('/admin')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should redirect unauthenticated users from /admin to /login', async () => {
      // Arrange
      AuthStore.getUserByAccessToken.mockResolvedValue(null)
      authStore.clearAuth()

      // Act
      await router.push('/admin')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('Document Title Updates', () => {
    it('should update document title for login page', async () => {
      // Arrange
      AuthStore.getUserByAccessToken.mockResolvedValue(null)

      // Act
      await router.push('/login')
      await flushPromises()

      // Assert
      expect(document.title).toBe('Sign In')
    })

    it('should update document title for dashboard', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      // Act
      await router.push('/home')
      await flushPromises()

      // Assert
      expect(document.title).toBe('Dashboard')
    })

    it('should update document title for admin panel', async () => {
      // Arrange
      const mockAdmin = createMockAdmin()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockAdmin)
      authStore.setUserFromApi(mockAdmin)

      // Act
      await router.push('/admin')
      await flushPromises()

      // Assert
      expect(document.title).toBe('Admin Panel')
    })

    it('should use default title for landing page', async () => {
      // Arrange
      AuthStore.getUserByAccessToken.mockResolvedValue(null)

      // Act
      await router.push('/')
      await flushPromises()

      // Assert
      expect(document.title).toBe('Teams Management')
    })
  })

  describe('Query Parameter Navigation', () => {
    it('should not re-check auth when only query params change', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
      authStore.setUserFromApi(mockUser)

      await router.push('/home')
      await flushPromises()

      // Clear mock call history
      AuthStore.getUserByAccessToken.mockClear()

      // Act - navigate to same route with different query
      await router.push('/home?tab=tasks')
      await flushPromises()

      // Assert - auth should not be checked again
      expect(AuthStore.getUserByAccessToken).not.toHaveBeenCalled()
      expect(router.currentRoute.value.path).toBe('/home')
      expect(router.currentRoute.value.query.tab).toBe('tasks')
    })
  })

  describe('Catch-All Route', () => {
    it('should show 404 page for unknown routes', async () => {
      // Act
      await router.push('/this-route-does-not-exist')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.matched[0].components.default).toBe(NotFound)
    })

    it('should set 404 title for unknown routes', async () => {
      // Act
      await router.push('/unknown')
      await flushPromises()

      // Assert
      expect(document.title).toBe('404 Not Found')
    })
  })
})
