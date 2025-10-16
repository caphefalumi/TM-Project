<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useComponentCache } from '../composables/useComponentCache.js'
import NotificationCenter from './NotificationCenter.vue'
import updateService from '../services/updateService.js'
import { useGlobalNotifications } from '../composables/useGlobalNotifications.js'

// Import Admin.Vue if username is 'admin'

const props = defineProps({
  showSignInButton: {
    type: Boolean,
    default: false
  },
  landingLinks: {
    type: Array,
    default: () => []
  }
})

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { clearAllCaches } = useComponentCache()
const { showSuccess, showError, showWarning, showInfo } = useGlobalNotifications()

const appTitle = 'Teams Management'

const isLoggedIn = computed(() => authStore.isLoggedIn && authStore.user?.userId)

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
      title: 'Desktop App Required',
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
    systemItems.value.push({
      title: 'Check for Updates',
      icon: 'mdi-download',
      action: checkForUpdates,
    })
  }

  // // Add test notifications item for development
  // if (import.meta.env.NODE_ENV !== 'PROD') {
  //   systemItems.value.push({ title: 'Test Notifications', icon: 'mdi-bell-ring', action: testNotifications })
  // }
}

// Watch for user changes to update navigation
watch(() => user.value.username, updateNavigationItems, { immediate: true })

const navigateToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div>
    <!-- App Bar at the top - Different styles for logged in vs logged out -->
    <v-app-bar
      app
      :color="isLoggedIn ? 'primary' : 'white'"
      :dark="isLoggedIn"
      :flat="!isLoggedIn"
      :elevation="isLoggedIn ? 4 : 0"
      class="topbar"
      :class="{ 'logged-out-topbar': !isLoggedIn }"
    >
      <!-- The `d-lg-none` class hides drawer icon for large screens and up when logged in -->
      <v-app-bar-nav-icon v-if="isLoggedIn" @click="drawer = !drawer"></v-app-bar-nav-icon>

      <!-- Logo/Title on the left -->
      <v-toolbar-title class="d-flex align-center cursor-pointer brand-title" @click="router.push(isLoggedIn ? '/home' : '/')">
        <v-icon
          size="32"
          class="mr-2 brand-icon"
          :class="{ 'logged-out-icon': !isLoggedIn }"
        >
          mdi-rocket-launch
        </v-icon>
        <span class="brand-text" :class="{ 'logged-out-text': !isLoggedIn }">
          {{ isLoggedIn ? currentTitle : appTitle }}
        </span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Landing page navigation links (when not logged in) -->
      <template v-if="!isLoggedIn">
        <div class="landing-nav d-none d-md-flex">
          <v-btn
            variant="text"
            class="nav-link"
            @click="router.push('/about')"
          >
            About
          </v-btn>
          <v-btn
            v-for="link in props.landingLinks.filter(l => !['Login', 'Sign Up'].includes(l.title))"
            :key="link.title"
            variant="text"
            class="nav-link"
            @click="link.to.startsWith('#') ? null : router.push(link.to)"
            :href="link.to.startsWith('#') ? link.to : null"
          >
            {{ link.title }}
          </v-btn>
        </div>

        <!-- Auth buttons with modern styling -->
        <div class="auth-buttons d-none d-md-flex ml-4">
          <v-btn
            variant="text"
            class="login-btn"
            @click="router.push('/login')"
          >
            Login
          </v-btn>
          <v-btn
            variant="text"
            class="login-btn"
            @click="router.push('/register')"
            rounded
          >
            Sign Up
          </v-btn>
        </div>

        <!-- Mobile menu button -->
        <v-menu v-if="$vuetify.display.smAndDown" class="d-md-none">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" class="mobile-menu-btn">
              <v-icon color="primary">mdi-menu</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="router.push('/about')">
              <v-list-item-title>About</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-for="link in props.landingLinks"
              :key="link.title"
              @click="link.to.startsWith('#') ? null : router.push(link.to)"
            >
              <v-list-item-title>{{ link.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <!-- Logged in user actions -->
      <template v-if="isLoggedIn">
        <NotificationCenter v-if="user.userId" :userId="user.userId" />

        <v-btn icon @click="logout">
          <v-icon v-tooltip:bottom="'Log out'">mdi-logout</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Navigation Drawer (Sidebar) - Only show when logged in -->
    <v-navigation-drawer v-if="isLoggedIn" v-model="drawer" :permanent="$vuetify.display.lgAndUp" app>
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

/* Logged Out Topbar Styles - Modern & Professional */
.logged-out-topbar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.98) !important;
}

.brand-title {
  font-weight: 600;
  transition: all 0.3s ease;
}

.brand-icon {
  transition: transform 0.3s ease;
}

.brand-title:hover .brand-icon {
  transform: rotate(15deg) scale(1.1);
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.logged-out-text {
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logged-out-icon {
  color: #1976d2 !important;
}

/* Landing Navigation Links */
.landing-nav {
  display: flex;
  gap: 4px;
  align-items: center;
}

.nav-link {
  color: #424242 !important;
  font-weight: 500;
  font-size: 0.95rem;
  text-transform: none;
  letter-spacing: 0;
  padding: 0 16px;
  height: 40px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background-color: rgba(25, 118, 210, 0.08) !important;
  color: #1976d2 !important;
}

/* Auth Buttons */
.auth-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.login-btn {
  color: #424242 !important;
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: none;
  padding: 0 20px;
  height: 40px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.login-btn:hover {
  background-color: rgba(25, 118, 210, 0.08) !important;
  color: #1976d2 !important;
}

.signup-btn {
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: none;
  padding: 0 24px !important;
  height: 40px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2) !important;
  transition: all 0.3s ease;
}

.signup-btn:hover {
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3) !important;
  transform: translateY(-1px);
}

/* Mobile Menu */
.mobile-menu-btn {
  color: #1976d2;
}

/* Logged In Topbar (Original styles) */
.topbar-link {
  color: #fff !important;
  font-weight: 500;
  font-size: 1rem;
  text-transform: none;
  background: transparent !important;
  border-radius: 8px;
  padding: 0 16px;
  min-width: 100px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: none !important;
  margin-right: 4px;
}

.topbar-link:hover {
  background: rgba(255, 255, 255, 0.18) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

.topbar-link span {
  color: #fff;
  font-weight: 500;
  font-size: 1rem;
  margin-left: 4px;
}

.topbar-link .v-icon {
  color: #fff !important;
}

.cursor-pointer {
  cursor: pointer;
}

/* Smooth transitions */
.topbar {
  transition: all 0.3s ease;
}
</style>
