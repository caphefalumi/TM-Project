<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
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

const originalUserId = ref('')

let storageListener = null

onMounted(async () => {
  const userData = await getUserByAccessToken()
  user.value = await getUserByAccessToken()
  if (userData) {
    user.value.userId = userData.userId
    user.value.username = userData.username
    user.value.email = userData.email

    originalUserId.value = userData.userId

    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        userId: userData.userId,
        username: userData.username,
        timestamp: Date.now(),
      }),
    )
  } else {
    user.value.username = 'Guest'
    user.value.email = ''
  }

  setupCrossTabDetection()
})

onUnmounted(() => {
  if (storageListener) {
    window.removeEventListener('storage', storageListener)
  }
})

const setupCrossTabDetection = () => {
  storageListener = (event) => {
    // Only listen for changes to currentUser
    if (event.key === 'currentUser' && event.newValue) {
      try {
        const newUserData = JSON.parse(event.newValue)

        // If a different user has logged in (different userId)
        if (originalUserId.value && newUserData.userId !== originalUserId.value) {
          // Show popup message
          if (
            confirm(
              `Another user (${newUserData.username}) has logged in. This page will reload to update the session.`,
            )
          ) {
            // Force reload the page
            window.location.reload()
          } else {
            // If user cancels, still reload for security
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          }
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error)
      }
    }
  }

  window.addEventListener('storage', storageListener)
}

const logout = async () => {
  try {
    drawer.value = false // Close the drawer
    console.log('Logging out user:', user.value.username)
    sessionStorage.removeItem('isLoggedIn')

    // Clear the current user from localStorage
    localStorage.removeItem('currentUser')

    // Use AuthStore logout which handles session cleanup
    const { logout: authLogout } = AuthStore
    await authLogout()

    // Clear local user data
    user.value = {
      userId: '',
      username: 'Guest',
      email: '',
    }

    // Clear original user ID
    originalUserId.value = ''

    console.log('Logout successful, redirecting to login page')
    // Redirect to the login page
    router.push('/')
  } catch (error) {
    console.error('Logout failed:', error)
    // Even if logout fails, still redirect to login for security
    router.push('/')
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
    <v-navigation-drawer
      id="tour-sidebar-nav"
      v-model="drawer"
      :permanent="$vuetify.display.lgAndUp"
      app
    >
      <!-- User profile section at the top of the drawer -->
      <v-list>
        <v-list-item
          :title="user.username"
          :subtitle="user.email"
          class="user-profile-item clickable-profile"
          @click="$router.push('/account/personal')"
        >
          <template v-slot:prepend>
            <v-avatar size="32" color="primary" class="mr-2">
              <span class="text-white">{{ user.username?.[0]?.toUpperCase() }}</span>
            </v-avatar>
          </template>
          <template v-slot:append>
            <v-icon size="small" class="profile-arrow">mdi-chevron-right</v-icon>
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

.user-profile-item {
  transition: background-color 0.2s ease;
}

.clickable-profile {
  cursor: pointer;
}

.clickable-profile:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.profile-arrow {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.clickable-profile:hover .profile-arrow {
  opacity: 1;
}
</style>
