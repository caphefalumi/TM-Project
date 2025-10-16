import { ref, computed } from 'vue'

// Global state for managing component cache
const cachedComponents = ref(new Set())
const refreshRequests = ref(new Set())
const forceRemountKey = ref(0) // Key to force remount of all components

// Dynamic component caching for team details (LRU-style with max limit)
const dynamicTeamCache = ref(new Map()) // teamId -> { lastAccessed: timestamp, componentKey: string }
const MAX_TEAM_CACHE_SIZE = 10 // Limit cached teams to prevent memory issues
const CACHE_EXPIRY_TIME = 30 * 60 * 1000 // 30 minutes in milliseconds

export function useComponentCache() {
  // Add component to cache
  const addToCache = (componentName) => {
    cachedComponents.value.add(componentName)
  }

  // Remove component from cache (forces remount)
  const removeFromCache = (componentName) => {
    cachedComponents.value.delete(componentName)
    refreshRequests.value.delete(componentName)
  }

  // Request refresh for a component
  const requestRefresh = (componentName) => {
    refreshRequests.value.add(componentName)
  }

  // Check if component needs refresh
  const needsRefresh = (componentName) => {
    return refreshRequests.value.has(componentName)
  }

  // Mark component as refreshed
  const markAsRefreshed = (componentName) => {
    refreshRequests.value.delete(componentName)
  }

  // Clean expired cache entries
  const cleanExpiredCache = () => {
    const now = Date.now()
    const toRemove = []

    for (const [teamId, data] of dynamicTeamCache.value.entries()) {
      if (now - data.lastAccessed > CACHE_EXPIRY_TIME) {
        toRemove.push(teamId)
      }
    }

    toRemove.forEach((teamId) => {
      const teamData = dynamicTeamCache.value.get(teamId)
      if (teamData) {
        removeFromCache(teamData.componentKey)
        dynamicTeamCache.value.delete(teamId)
        console.log('Removed expired team from cache:', teamId)
      }
    })

    return toRemove.length
  }

  // Dynamic team caching methods
  const addTeamToCache = (teamId) => {
    if (!teamId) return null

    // Clean expired entries first
    cleanExpiredCache()

    const componentKey = 'TeamDetails'
    const now = Date.now()

    // Check if team is already cached
    const existingTeam = dynamicTeamCache.value.get(teamId)

    // If cache is at limit, remove least recently accessed team
    if (!existingTeam && dynamicTeamCache.value.size >= MAX_TEAM_CACHE_SIZE) {
      let oldestTeamId = null
      let oldestTime = now

      for (const [id, data] of dynamicTeamCache.value.entries()) {
        if (data.lastAccessed < oldestTime) {
          oldestTime = data.lastAccessed
          oldestTeamId = id
        }
      }

      if (oldestTeamId) {
        dynamicTeamCache.value.delete(oldestTeamId)
        console.log('Removed oldest team from cache:', oldestTeamId)
      }
    }

    // Add/update team in cache tracking
    const isNew = !existingTeam
    dynamicTeamCache.value.set(teamId, {
      lastAccessed: now,
      componentKey,
    })

    // Ensure TeamDetails component is cached
    addToCache(componentKey)

    if (isNew) {
      console.log('Added team to cache tracking:', teamId)
    }
    return componentKey
  }

  const updateTeamAccess = (teamId) => {
    if (!teamId) return

    const teamData = dynamicTeamCache.value.get(teamId)
    if (teamData) {
      teamData.lastAccessed = Date.now()
    }
  }

  const isTeamCacheValid = (teamId) => {
    if (!teamId) return false

    const teamData = dynamicTeamCache.value.get(teamId)
    if (!teamData) return false

    const now = Date.now()
    const isValid = now - teamData.lastAccessed < CACHE_EXPIRY_TIME

    if (!isValid) {
      console.log('Team cache expired for:', teamId)
      removeTeamFromCache(teamId)
    }

    return isValid
  }

  const removeTeamFromCache = (teamId) => {
    if (!teamId) return

    const teamData = dynamicTeamCache.value.get(teamId)
    if (teamData) {
      dynamicTeamCache.value.delete(teamId)
      console.log('Removed team from cache tracking:', teamId)
      // Don't remove TeamDetails component from cache, just the tracking data
    }
  }

  const getTeamComponentKey = (teamId) => {
    if (!teamId) return null

    return 'TeamDetails' // Always return the component name
  }

  const refreshTeam = (teamId) => {
    if (!teamId) return

    // Remove team data from tracking, which will force reload
    dynamicTeamCache.value.delete(teamId)
    console.log('Requested refresh for team:', teamId)
  }

  // Clear all team caches (useful for logout)
  const clearAllTeamCaches = () => {
    const teamCount = dynamicTeamCache.value.size
    dynamicTeamCache.value.clear()
    console.log(`Cleared all team caches (${teamCount} teams)`)
    return teamCount
  }

  // Clear all component caches (useful for logout)
  const clearAllComponentCaches = () => {
    const componentCount = cachedComponents.value.size
    cachedComponents.value.clear()
    refreshRequests.value.clear()
    console.log(`Cleared all component caches (${componentCount} components)`)
    return componentCount
  }

  // Clear everything - both components and team data (logout cleanup)
  const clearAllCaches = () => {
    const teamCount = clearAllTeamCaches()
    const componentCount = clearAllComponentCaches()

    // Increment the remount key to force all components to remount
    // This ensures that all cached component instances are destroyed and recreated
    forceRemountKey.value++

    console.log(
      `[Cache] Cleared all caches - ${componentCount} components, ${teamCount} teams (remount key: ${forceRemountKey.value})`,
    )
    return { components: componentCount, teams: teamCount, remountKey: forceRemountKey.value }
  }

  // Get list of components to include in keep-alive
  const includeComponents = computed(() => {
    const staticComponents = ['Dashboard', 'TeamsView', 'FeedbackView', 'AboutView', 'TeamDetails']
    // For team details, we cache the component itself, not multiple instances
    return staticComponents
  })

  // Initialize main views in cache
  const initializeMainViews = () => {
    const mainViews = ['Dashboard', 'TeamsView', 'FeedbackView', 'AboutView', 'TeamDetails']
    mainViews.forEach((view) => addToCache(view))
    console.log('Initialized main views for keep-alive caching:', mainViews)
  }

  // Force refresh all main views (useful for debugging)
  const refreshAllMainViews = () => {
    const mainViews = ['Dashboard', 'TeamsView', 'FeedbackView', 'AboutView', 'TeamDetails']
    mainViews.forEach((view) => requestRefresh(view))
    console.log('Requested refresh for all main views:', mainViews)
  }

  // Get cache statistics for debugging
  const getCacheStats = () => {
    // Clean expired entries before reporting stats
    const expiredCount = cleanExpiredCache()

    return {
      staticComponents: 4,
      cachedTeams: dynamicTeamCache.value.size,
      totalCachedComponents: includeComponents.value.length,
      expiredEntriesRemoved: expiredCount,
      cacheExpiryMinutes: Math.round(CACHE_EXPIRY_TIME / (60 * 1000)),
      teamCacheDetails: Object.fromEntries(
        Array.from(dynamicTeamCache.value.entries()).map(([teamId, data]) => [
          teamId,
          {
            componentKey: data.componentKey,
            lastAccessed: new Date(data.lastAccessed).toLocaleTimeString(),
            expiresIn:
              Math.round((CACHE_EXPIRY_TIME - (Date.now() - data.lastAccessed)) / (60 * 1000)) +
              'min',
          },
        ]),
      ),
    }
  }

  // Helper: call when switching tabs in TeamDetails to update cache access
  const onTeamTabChange = (teamId) => {
    updateTeamAccess(teamId)
  }

  return {
    // Static component methods
    addToCache,
    removeFromCache,
    requestRefresh,
    needsRefresh,
    markAsRefreshed,
    includeComponents,
    initializeMainViews,
    refreshAllMainViews,
    forceRemountKey, // Export the remount key for router-view
    // Dynamic team caching methods
    addTeamToCache,
    updateTeamAccess,
    removeTeamFromCache,
    getTeamComponentKey,
    refreshTeam,
    isTeamCacheValid,
    cleanExpiredCache,
    getCacheStats,
    clearAllTeamCaches,
    clearAllComponentCaches,
    clearAllCaches,
    onTeamTabChange,
  }
}
