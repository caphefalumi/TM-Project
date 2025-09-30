<script setup>
import SideBar from './components/Sidebar.vue'
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Notification system
const showSignOutDialog = ref(false)
const signOutMessage = ref('')

const showSignOutPopup = (message = 'You have been signed out.') => {
  signOutMessage.value = message
  showSignOutDialog.value = true

  authStore.clearAuth()

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

// Auto token refresh functionality
let tokenRefreshInterval = null

const refreshAccessToken = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    console.log('Auto-refreshing access token...')

    const response = await fetch(`${PORT}/api/sessions/refresh`, {
      method: 'POST',
      credentials: 'include', // Important: sends refresh token cookie
    })

    if (response.ok) {
      authStore.setLoggedIn(true)

      if (!authStore.user) {
        await authStore.fetchUser()
      }
      console.log('Access token auto-refreshed successfully')
      return true
    } else if (response.status === 401) {
      // Check if it's a token revocation error
      try {
        const errorData = await response.json()
        if (errorData.error === 'TOKEN_REVOKED' || errorData.error === 'TOKEN_INVALID') {
          console.warn('Token was revoked during auto-refresh')
          console.warn(errorData.error)
          // Show sign out popup directly
          showSignOutPopup(errorData.message || 'You have been signed out.')
          return false
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
      }

      authStore.clearAuth()
      console.warn('Auto token refresh failed:', response.status, response.statusText)
      return false
    } else {
      console.warn('Auto token refresh failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('Error during auto token refresh:', error)
    authStore.clearAuth()
    return false
  }
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
    18 * 60 * 1000,
  ) // 18 minutes in milliseconds

  console.log('Auto token refresh started - will refresh every 9 minutes when authenticated')
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

onMounted(() => {
  refreshAccessToken() // Initial token refresh on mount
  // Start token refresh if user is already authenticated
  if (showSidebar.value) {
    startTokenRefresh()
  }
})

onUnmounted(() => {
  // Clean up interval when component is destroyed
  stopTokenRefresh()
})
</script>

<template>
  <v-app>
    <!-- Only show SideBar on authenticated routes -->
    <SideBar v-if="showSidebar"></SideBar>
    <!-- Main content area -->
    <v-main>
      <router-view></router-view>
    </v-main>

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
  </v-app>
</template>
