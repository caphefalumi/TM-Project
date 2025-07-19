<script setup>
import SideBar from './client/components/Sidebar.vue'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

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

    const response = await fetch(`http://localhost:${PORT}/api/tokens/access`, {
      method: 'GET',
      credentials: 'include', // Important: sends refresh token cookie
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Access token auto-refreshed successfully')
      return true
    } else {
      console.warn('Auto token refresh failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('Error during auto token refresh:', error)
    return false
  }
}

const startTokenRefresh = () => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval)
  }

  // Set up interval to refresh token every 9 minutes (540,000 ms)
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
    9 * 60 * 1000,
  ) // 9 minutes in milliseconds

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
    <v-main :class="{ 'with-sidebar': showSidebar }">
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<style>
/* Adjust layout based on sidebar visibility */
.with-sidebar {
  padding-left: 256px; /* Adjust based on your sidebar width */
}

@media (max-width: 1200px) {
  /* On mobile/small screens, don't add padding since sidebar will be overlay */
  .with-sidebar {
    padding-left: 0;
  }
}
</style>
