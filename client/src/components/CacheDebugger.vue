<template>
  <v-card v-if="showDebugger" class="cache-debugger ma-2" variant="outlined">
    <v-card-title class="text-subtitle-2 py-2">
      <v-icon start size="small">mdi-cached</v-icon>
      Cache Debug Panel
      <v-spacer></v-spacer>
      <v-btn icon size="x-small" @click="showDebugger = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text class="py-2">
      <div class="text-caption mb-2">
        <strong>Active Components:</strong> {{ stats.totalCachedComponents }}
      </div>
      <div class="text-caption mb-2"><strong>Cached Teams:</strong> {{ stats.cachedTeams }}</div>
      <div class="text-caption mb-2"><strong>Current Route:</strong> {{ currentRoute }}</div>
      <div v-if="Object.keys(stats.teamCacheDetails).length > 0" class="text-caption">
        <div><strong>Team Cache Details:</strong></div>
        <div
          v-for="(details, teamId) in stats.teamCacheDetails"
          :key="teamId"
          class="ml-2 d-flex align-center"
        >
          <div class="flex-grow-1">
            • {{ teamId }}: {{ details.componentKey }} ({{ details.lastAccessed }}, expires
            {{ details.expiresIn }})
          </div>
          <v-btn
            size="x-small"
            variant="text"
            icon="mdi-refresh"
            @click="forceRefreshTeam(teamId)"
            :title="`Force refresh team ${teamId}`"
          />
        </div>
      </div>
      <div class="text-caption mt-2">
        <strong>Cache Expiry:</strong> {{ stats.cacheExpiryMinutes }} minutes
      </div>
      <div class="text-caption">
        <strong>Expired Entries Cleaned:</strong> {{ stats.expiredEntriesRemoved }}
      </div>
    </v-card-text>
  </v-card>

  <!-- Floating action button to show debugger -->
  <v-btn
    v-if="!showDebugger && isDev"
    fab
    fixed
    bottom
    right
    size="small"
    color="primary"
    class="cache-debug-fab"
    @click="showDebugger = true"
  >
    <v-icon>mdi-cached</v-icon>
  </v-btn>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useComponentCache } from '../composables/useComponentCache.js'

const route = useRoute()
const { getCacheStats, removeTeamFromCache, cleanExpiredCache } = useComponentCache()

const showDebugger = ref(false)

const stats = computed(() => getCacheStats())
const currentRoute = computed(() => `${route.name} (${route.path})`)
const isDev = computed(() => {
  const customDev = import.meta.env.VITE_DEV
  if (customDev !== undefined) {
    return customDev === 'true'
  }
  return false
})

const forceRefreshTeam = (teamId) => {
  console.log('Force refreshing team from cache debugger:', teamId)
  removeTeamFromCache(teamId)

  // If we're currently on this team, trigger a page reload
  if (route.params.teamId === teamId) {
    window.location.reload()
  }
}
</script>

<style scoped>
.cache-debugger {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 300px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
}

.cache-debug-fab {
  bottom: 80px !important;
  right: 20px !important;
  z-index: 999;
}

@media (max-width: 600px) {
  .cache-debugger {
    right: 10px;
    left: 10px;
    width: auto;
  }

  .cache-debug-fab {
    right: 10px !important;
    bottom: 70px !important;
  }
}
</style>
