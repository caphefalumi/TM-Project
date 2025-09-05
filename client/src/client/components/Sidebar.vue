<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import NotificationCenter from './NotificationCenter.vue'

// Import Admin.Vue if username is 'admin'

const router = useRouter()

const { getUserByAccessToken } = AuthStore
// Controls the visibility of the navigation drawer.
// `ref(null)` allows Vuetify to automatically manage the state
// based on the screen size (starts open on desktop, closed on mobile).

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const drawer = ref(null)

onMounted(async () => {
  const userData = await getUserByAccessToken()
  user.value = await getUserByAccessToken()
  if (userData) {
    user.value.userId = userData.userId
    user.value.username = userData.username
    user.value.email = userData.email
  } else {
    user.value.username = 'Guest'
    user.value.email = ''
  }
})

const logout = async () => {
  try {
    drawer.value = false // Close the drawer
    console.log('Logging out user:', user.value.username)
    sessionStorage.removeItem('isLoggedIn')
    // Revoke refresh token from database and clear cookies
    await revokeRefreshToken()

    // Clear local user data
    user.value = {
      userId: '',
      username: 'Guest',
      email: '',
    }

    console.log('Logout successful, redirecting to login page')
    // Redirect to the login page
    router.push('/')
  } catch (error) {
    console.error('Logout failed:', error)
    // Even if logout fails, still redirect to login for security
    router.push('/')
  }
}

const revokeRefreshToken = async () => {
  console.log('Revoking refresh token for user:', user.value.username)

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/auth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies in request
      body: JSON.stringify({ userId: user.value.userId }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Failed to revoke refresh token:', responseData.error || 'Unknown error')
      throw new Error(responseData.error || 'Failed to revoke refresh token')
    } else {
      console.log('Refresh token revoked successfully:', responseData.message)
      return responseData
    }
  } catch (error) {
    console.error('Error revoking refresh token:', error.message)
    throw error
  }
}

// Defines the navigation items for the sidebar.
// Each item has a title, a Material Design Icon, and a route path.
const items = ref([
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/home' },
  { title: 'Teams', icon: 'mdi-briefcase-variant', to: '/teams' },
  { title: 'About', icon: 'mdi-information', to: '/about' },
])

// Add admin menu item only if user is admin
const adminItems = ref([])

// Check if user is admin and update navigation items
const updateNavigationItems = () => {
  if (user.value.username === 'admin') {
    adminItems.value = [{ title: 'Admin Panel', icon: 'mdi-shield-crown', to: '/admin' }]
  } else {
    adminItems.value = []
  }
}

// Watch for user changes to update navigation
import { watch } from 'vue'
watch(() => user.value.username, updateNavigationItems, { immediate: true })
</script>

<template>
  <div>
    <!-- App Bar at the top -->
    <v-app-bar id="tour-app-header" app color="primary" dark>
      <!-- The `d-lg-none` class hides drawer icon for large screens and up -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-toolbar-title>Teams Management</v-toolbar-title>

      <v-spacer></v-spacer>

      <NotificationCenter id="tour-notification-center" v-if="user.userId" :userId="user.userId" />

      <v-btn icon @click="logout">
        <v-icon v-tooltip:bottom="'Log out'">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer (Sidebar) -->
    <v-navigation-drawer id="tour-sidebar-nav" v-model="drawer" :permanent="$vuetify.display.lgAndUp" app>
      <!-- User profile section at the top of the drawer -->
      <v-list>
        <v-list-item :title="user.username" :subtitle="user.email">
          <template v-slot:prepend>
            <v-avatar size="32" color="primary" class="mr-2">
              <span class="text-white">{{ user.username?.[0]?.toUpperCase() }}</span>
            </v-avatar>
          </template>
        </v-list-item>
      </v-list>

      <v-divider></v-divider>

      <!-- Navigation links -->
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in items"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          class="text-h5"
          link
        ></v-list-item>

        <!-- Admin section with divider -->
        <template v-if="adminItems.length > 0">
          <v-divider class="my-2"></v-divider>
          <v-list-subheader>Administration</v-list-subheader>
          <v-list-item
            v-for="item in adminItems"
            :key="item.title"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
            class="text-h5"
            link
            id="tour-admin-nav"
          ></v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
/* Scoped styles for this component */
.v-list-item--active {
  background-color: #5ee4ff;
  color: black;
  transition: 0.5s ease-in-out;
}

.search-field {
  margin-right: 8px;
}
</style>
