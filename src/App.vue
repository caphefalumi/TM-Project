<script setup>
import SideBar from './client/components/Sidebar.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Compute whether the current route requires authentication
const showSidebar = computed(() => {
  // Check if any of the matched routes require authentication
  return route.matched.some((record) => record.meta.requiresAuth)
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
