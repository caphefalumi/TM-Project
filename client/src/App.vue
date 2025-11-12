<script setup>
import SideBar from './components/Sidebar.vue'
import CacheDebugger from './components/CacheDebugger.vue'
import GlobalNotifications from './components/GlobalNotifications.vue'
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { useComponentCache } from './composables/useComponentCache.js'
import { useNotificationStore } from './stores/notifications.js'
import updateService from './services/updateService.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const {
  includeComponents,
  initializeMainViews,
  getCacheStats,
  cleanExpiredCache,
  clearAllCaches,
  forceRemountKey,
} = useComponentCache()

// Development mode check - Use custom DEV env variable if set, otherwise default to false
const isDev = computed(() => {
  const customDev = import.meta.env.VITE_DEV
  if (customDev !== undefined) {
    return customDev === 'true'
  }
  return false
})

// Notification system
const showSignOutDialog = ref(false)
const signOutMessage = ref('')

const showSignOutPopup = (message = 'You have been signed out.') => {
  signOutMessage.value = message
  showSignOutDialog.value = true

  authStore.clearAuth()

  // Clear all caches when token is invalid/revoked
  clearAllCaches()
  console.log('[Auth] Cleared all caches due to invalid/revoked token')

  // Stop auto refresh
  stopTokenRefresh()
}

const handleSignOutDialogClose = () => {
  showSignOutDialog.value = false
  // Redirect to login page
  router.push('/login')
}

// Compute whether the current route requires authentication
const showSidebar = computed(() => {
  // Check if any of the matched routes require authentication
  return route.matched.some((record) => record.meta.requiresAuth)
})

// Landing page links for non-authenticated users
const landingLinks = [
  { title: 'Login', icon: 'mdi-login', to: '/login' },
  { title: 'Sign Up', icon: 'mdi-account-plus', to: '/register' },
  { title: 'Docs', icon: 'mdi-book-open-variant', to: '/docs' },
]

// Auto token refresh functionality
let tokenRefreshInterval = null

const refreshAccessToken = async () => {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 2000
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    try {
      const PORT = import.meta.env.VITE_API_PORT
      console.log('Auto-refreshing access token... (attempt', attempt + 1, ')')
      const response = await fetch(`${PORT}/api/sessions/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        authStore.setLoggedIn(true)
        if (!authStore.user) {
          await authStore.fetchUser()
        }
        console.log('Access token auto-refreshed successfully')
        return true
      } else if (response.status === 401) {
        try {
          const errorData = await response.json()
          if (errorData.error === 'TOKEN_REVOKED' || errorData.error === 'TOKEN_INVALID') {
            console.warn('Token was revoked during auto-refresh')
            showSignOutPopup(errorData.message || 'You have been signed out.')
            return false
          }
        } catch (parseError) {
          console.log('Error parsing response:', parseError)
        }
        authStore.clearAuth()
        console.warn('Auto token refresh failed:', response.status, response.statusText)
        // Only retry if not last attempt
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          attempt++
          continue
        }
        return false
      } else {
        console.warn('Auto token refresh failed:', response.status, response.statusText)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          attempt++
          continue
        }
        return false
      }
    } catch (error) {
      console.log('Error during auto token refresh:', error)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        attempt++
        continue
      }
      authStore.clearAuth()
      return false
    }
  }
  return false
}

const startTokenRefresh = () => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
  }

  // Set up interval to refresh token every 18 minutes
  tokenRefreshInterval = setInterval(
    async () => {
      if (showSidebar.value) {
        console.log('Starting scheduled token refresh...')
        const success = await refreshAccessToken()
        if (!success) {
          console.warn('Scheduled token refresh failed - user may need to login again')
          // Note: If it's a token revocation, the refreshAccessToken function
          // will already trigger the tokenRevoked event, so no need to handle it here
        }
      }
    },
    12 * 60 * 1000,
  ) // 12 minutes in milliseconds

  console.log('Auto token refresh started - will refresh every 12 minutes when authenticated')
}

const stopTokenRefresh = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
    tokenRefreshInterval = null
    console.log('Auto token refresh stopped')
  }
}

// Watch showSidebar to start/stop token refresh based on authentication status
watch(
  showSidebar,
  (newValue) => {
    if (newValue) {
      // User is authenticated, start auto refresh
      startTokenRefresh()
    } else {
      // User is not authenticated, stop auto refresh
      stopTokenRefresh()
    }
  },
  { immediate: true },
)

// Handle token revocation events from API client
const handleTokenRevoked = (event) => {
  const message = event.detail?.message || 'Your session has been terminated. Please sign in again.'
  showSignOutPopup(message)
}

onMounted(() => {
  refreshAccessToken() // Initial token refresh on mount
  // Start token refresh if user is already authenticated
  if (showSidebar.value) {
    startTokenRefresh()
  }
  // Initialize main views in component cache
  initializeMainViews()

  // Initialize notification store and update service
  updateService.init(notificationStore)

  // Check for updates on startup (only in Tauri environment)
  if (window.isTauri) {
    setTimeout(() => {
      updateService.checkForUpdatesOnStartup()
    }, 2000) // Wait 2 seconds after app loads
  }

  // Set up periodic cache cleanup every 5 minutes
  setInterval(
    () => {
      const cleaned = cleanExpiredCache()
      if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired cache entries`)
      }
    },
    5 * 60 * 1000,
  ) // 5 minutes

  // Listen for token revocation events from API client
  window.addEventListener('token-revoked', handleTokenRevoked)
})

onUnmounted(() => {
  // Clean up interval when component is destroyed
  stopTokenRefresh()

  // Clean up event listener
  window.removeEventListener('token-revoked', handleTokenRevoked)
})
</script>

<template>
  <v-app>
    <!-- Always show SideBar with dynamic content based on auth status -->
    <SideBar :landingLinks="landingLinks" />
    <!-- Main content area -->
    <v-main>
      <router-view v-slot="{ Component, route }">
        <keep-alive :include="includeComponents">
          <component :is="Component" :key="`${route.path}-${forceRemountKey}`" />
        </keep-alive>
      </router-view>
    </v-main>

    <!-- Global Notifications -->
    <GlobalNotifications />

    <!-- Sign Out Notification Dialog -->
    <v-dialog v-model="showSignOutDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-logout</v-icon>
          Signed Out
        </v-card-title>
        <v-card-text>
          <p>{{ signOutMessage }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="elevated" @click="handleSignOutDialogClose">
            Go to Login
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cache debugger for development -->
    <CacheDebugger v-if="isDev" />
  </v-app>
</template>
