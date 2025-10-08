<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useComponentCache } from '../composables/useComponentCache.js'
import NotificationCenter from './NotificationCenter.vue'
import updateService from '../services/updateService.js'
import { useGlobalNotifications } from '../composables/useGlobalNotifications.js'

// Import Admin.Vue if username is 'admin'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { clearAllCaches } = useComponentCache()

const appTitle = 'Teams Management'

const currentTitle = computed(() => {
  const matchedWithTitle = [...route.matched].reverse().find((record) => record.meta?.title)
  const pageTitle = matchedWithTitle?.meta?.title

  if (pageTitle && pageTitle !== appTitle) {
    return pageTitle
  }

  return appTitle
})

// Controls the visibility of the navigation drawer.
// `ref(null)` allows Vuetify to automatically manage the state
// based on the screen size (starts open on desktop, closed on mobile).
const drawer = ref(null)

const user = computed(() => {
  return (
    authStore.user || {
      userId: '',
      username: 'Guest',
      email: '',
    }
  )
})

const originalUserId = ref('')

onMounted(async () => {
  const userData = await authStore.ensureUser()
  if (userData?.userId) {
    originalUserId.value = userData.userId
  }
})

watch(
  () => authStore.user,
  (newUser) => {
    if (!newUser) {
      if (!authStore.isExternalUpdate) {
        originalUserId.value = ''
      }
      return
    }

    if (authStore.isExternalUpdate) {
      if (originalUserId.value && newUser.userId && newUser.userId !== originalUserId.value) {
        const confirmed = confirm(
          `Another user (${newUser.username}) has logged in. This page will reload to update the session.`,
        )

        if (confirmed) {
          window.location.reload()
        } else {
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      }
      return
    }

    if (newUser.userId && newUser.userId !== originalUserId.value) {
      originalUserId.value = newUser.userId
    }
  },
  { deep: true },
)

const { showSuccess, showError, showWarning, showInfo } = useGlobalNotifications()

const logout = async () => {
  try {
    drawer.value = false
    await authStore.logout()

    clearAllCaches()

    originalUserId.value = ''

    router.push('/')
  } catch (error) {
    router.push('/')
  }
}

// Function to manually check for updates
const checkForUpdates = () => {
  if (window.isTauri) {
    updateService.checkForUpdates()
  } else {
    // For testing purposes in web mode
    showInfo('Update check is only available in the desktop app', {
      title: 'Desktop App Required'
    })
  }
}

// Test function to show different notification types
const testNotifications = () => {
  showSuccess('This is a success notification!', { title: 'Success' })

  showError('This is an error notification!', { title: 'Error' })

  showWarning('This is a warning notification!', { title: 'Warning' })

  showInfo('This is an info notification!', { title: 'Information' })
}

// Defines the navigation items for the sidebar.
// Each item has a title, a Material Design Icon, and a route path.
const items = ref([
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/home' },
  { title: 'Teams', icon: 'mdi-briefcase-variant', to: '/teams' },
  { title: 'About', icon: 'mdi-information', to: '/about' },
  { title: 'Feedback', icon: 'mdi-comment', to: '/feedback' },
])

// Add admin menu item only if user is admin
const adminItems = ref([])

// System items for app-related functions
const systemItems = ref([])

// Check if user is admin and update navigation items
const updateNavigationItems = () => {
  if (user.value.username === 'admin') {
    adminItems.value = [{ title: 'Admin Panel', icon: 'mdi-shield-crown', to: '/admin' }]
  } else {
    adminItems.value = []
  }

  // Add system items
  systemItems.value = []

  if (window.isTauri) {
    systemItems.value.push({ title: 'Check for Updates', icon: 'mdi-download', action: checkForUpdates })
  }

  // Add test notifications item for development
  systemItems.value.push({ title: 'Test Notifications', icon: 'mdi-bell-ring', action: testNotifications })
}

// Watch for user changes to update navigation
watch(() => user.value.username, updateNavigationItems, { immediate: true })
</script>

<template>
  <div>
    <!-- App Bar at the top -->
    <v-app-bar app color="primary" dark>
      <!-- The `d-lg-none` class hides drawer icon for large screens and up -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-toolbar-title>{{ currentTitle }}</v-toolbar-title>

      <v-spacer></v-spacer>

      <NotificationCenter v-if="user.userId" :userId="user.userId" />

      <v-btn icon @click="logout">
        <v-icon v-tooltip:bottom="'Log out'">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer (Sidebar) -->
    <v-navigation-drawer

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
          ></v-list-item>
        </template>

        <!-- System section with divider -->
        <template v-if="systemItems.length > 0">
          <v-divider class="my-2"></v-divider>
          <v-list-subheader>System</v-list-subheader>
          <v-list-item
            v-for="item in systemItems"
            :key="item.title"
            :prepend-icon="item.icon"
            :title="item.title"
            class="text-h5"
            link
            @click="item.action"
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
