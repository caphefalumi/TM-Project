import { ref, computed } from 'vue'

// Global state for managing component cache
const cachedComponents = ref(new Set())
const refreshRequests = ref(new Set())

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

  // Get list of components to include in keep-alive
  const includeComponents = computed(() => {
    return Array.from(cachedComponents.value)
  })

  // Initialize main views in cache
  const initializeMainViews = () => {
    const mainViews = ['Dashboard', 'TeamsView', 'FeedbackView', 'AboutView']
    mainViews.forEach(view => addToCache(view))
    console.log('✅ Initialized main views for keep-alive caching:', mainViews)
  }

  // Force refresh all main views (useful for debugging)
  const refreshAllMainViews = () => {
    const mainViews = ['Dashboard', 'TeamsView', 'FeedbackView', 'AboutView']
    mainViews.forEach(view => requestRefresh(view))
    console.log('🔄 Requested refresh for all main views:', mainViews)
  }

  return {
    addToCache,
    removeFromCache,
    requestRefresh,
    needsRefresh,
    markAsRefreshed,
    includeComponents,
    initializeMainViews,
    refreshAllMainViews
  }
}