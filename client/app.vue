<script setup>
import SideBar from './app/components/Sidebar.vue'
import CacheDebugger from './app/components/CacheDebugger.vue'
import GlobalNotifications from './app/components/GlobalNotifications.vue'
import TMFooter from './app/components/TMFooter.vue'
import { useAuthStore } from './app/stores/auth.js'
import { useComponentCache } from './app/composables/useComponentCache.js'
import { useNotificationStore } from './app/stores/notifications.js'
import updateService from './app/services/updateService.js'

// Use Nuxt composables
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

// Stores
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// Component cache composable
const { includeComponents, initializeMainViews, getCacheStats, cleanExpiredCache, clearAllCaches, forceRemountKey } = useComponentCache()

// SEO Head configuration
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Teams Management` : 'Teams Management'
  }
})

// Development mode check
const isDev = computed(() => {
  return config.public.isDev || false
})

const showSignOutDialog = ref(false)
const signOutMessage = ref('')

const showSignOutPopup = (message = 'You have been signed out.') => {
  signOutMessage.value = message
  showSignOutDialog.value = true
  authStore.clearAuth()
  clearAllCaches()
  console.log('[Auth] Cleared all caches due to invalid/revoked token')
  stopTokenRefresh()
}

const handleSignOutDialogClose = () => {
  showSignOutDialog.value = false
  router.push('/login')
}

const showSidebar = computed(() => {
  // Check if current route requires authentication
  const requiresAuth = route.meta.requiresAuth
  return requiresAuth === true
})

let tokenRefreshInterval = null

const refreshAccessToken = async () => {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 2000
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    try {      const apiPort = config.public.apiPort
      console.log('Auto-refreshing access token... (attempt', attempt + 1, ')')
      const response = await fetch(`${apiPort}/api/sessions/refresh`, {
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
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
  }
  tokenRefreshInterval = setInterval(
    async () => {
      if (showSidebar.value) {
        console.log('Starting scheduled token refresh...')
        const success = await refreshAccessToken()
        if (!success) {
          console.warn('Scheduled token refresh failed - user may need to login again')
        }
      }
    },
    12 * 60 * 1000,
  )
  console.log('Auto token refresh started - will refresh every 12 minutes when authenticated')
}

const stopTokenRefresh = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
    tokenRefreshInterval = null
    console.log('Auto token refresh stopped')
  }
}

watch(
  showSidebar,
  (newValue) => {
    if (newValue) {
      startTokenRefresh()
    } else {
      stopTokenRefresh()
    }
  },
  { immediate: true },
)

const handleTokenRevoked = (event) => {
  const message = event.detail?.message || 'Your session has been terminated. Please sign in again.'
  showSignOutPopup(message)
}

onMounted(() => {
  refreshAccessToken()
  if (showSidebar.value) {
    startTokenRefresh()
  }
  initializeMainViews()
  updateService.init(notificationStore)
  if (window.isTauri) {
    setTimeout(() => {
      updateService.checkForUpdatesOnStartup()
    }, 2000)
  }
  setInterval(() => {
    const cleaned = cleanExpiredCache()
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired cache entries`)
    }
  }, 5 * 60 * 1000)
  window.addEventListener('token-revoked', handleTokenRevoked)
})

onUnmounted(() => {
  stopTokenRefresh()
  window.removeEventListener('token-revoked', handleTokenRevoked)
})
</script>

<template>
  <v-app>
    <SideBar v-if="showSidebar"></SideBar>
    <v-main>
      <NuxtPage />
    </v-main>
    <GlobalNotifications />
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
    <CacheDebugger v-if="isDev" />
    <TMFooter />
  </v-app>
</template>
