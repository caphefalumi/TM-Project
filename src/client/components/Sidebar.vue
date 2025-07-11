<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'

const router = useRouter()

const { getUserByAccessToken } = AuthStore
// Controls the visibility of the navigation drawer.
// `ref(null)` allows Vuetify to automatically manage the state
// based on the screen size (starts open on desktop, closed on mobile).

const username = ref('')
const email = ref('')
const drawer = ref(null)

onMounted(async () => {
  const user = await getUserByAccessToken()
  if (user) {
    username.value = user.username
    email.value = user.email
  } else {
    username.value = 'Guest'
    email.value = ''
  }
})

const logout = () => {
  drawer.value = false // Close the drawer after redirecting
  // Clear Refresh Token

  router.push('/')
}

// Defines the navigation items for the sidebar.
// Each item has a title, a Material Design Icon, and a route path.
const items = ref([
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/home' },
  { title: 'Teams', icon: 'mdi-briefcase-variant', to: '/teams' },
  { title: 'Inbox', icon: 'mdi-inbox-full', to: '/inbox' },
  { title: 'About', icon: 'mdi-information', to: '/about' },
])
</script>

<template>
  <div>
    <!-- App Bar at the top -->
    <v-app-bar app color="primary" dark>
      <!-- The `d-lg-none` class hides drawer icon for large screens and up -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-toolbar-title>Teams Management</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn icon>
        <v-icon v-tooltip:bottom="'Notifications'">mdi-bell</v-icon>
      </v-btn>

      <v-btn icon @click="logout">
        <v-icon v-tooltip:bottom="'Log out'">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer (Sidebar) -->
    <v-navigation-drawer v-model="drawer" :permanent="$vuetify.display.lgAndUp" app>
      <!-- User profile section at the top of the drawer -->
      <v-list>
        <v-list-item
          prepend-avatar="https://randomuser.me/api/portraits/men/85.jpg"
          :title="username"
          :subtitle="email"
        ></v-list-item>
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
