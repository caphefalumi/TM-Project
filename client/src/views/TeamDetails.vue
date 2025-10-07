<script setup>
import { ref, onMounted, watch, computed, onActivated, onDeactivated, getCurrentInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import { fetchJSON } from '../scripts/apiClient.js'
import { permissionService } from '../scripts/permissionService.js'
import { useComponentCache } from '../composables/useComponentCache.js'

// Set component name for Vue keep-alive
defineOptions({
  name: 'TeamDetails'
})
import NewTasks from '../components/NewTasks.vue'
import NewAnnouncements from '../components/NewAnnouncements.vue'
import TaskSubmission from '../components/TaskSubmission.vue'
import DeleteMembers from '../components/DeleteMembers.vue'
import UpdateAnnouncements from '../components/UpdateAnnouncements.vue'
import DeleteAnnouncements from '../components/DeleteAnnouncements.vue'
import AnnouncementView from '../components/AnnouncementView.vue'
import UpdateTaskGroups from '../components/UpdateTaskGroups.vue'
import RoleManagement from '../components/RoleManagement.vue'
import RoleManagementTabs from '../components/RoleManagementTabs.vue'
import NewMembers from '../components/NewMembers.vue'
import NotFound from './NotFound.vue'

// Tab Components
import TasksTab from '../components/TasksTab.vue'
import WorkflowTab from '../components/WorkflowTab.vue'
import TaskGroupsTab from '../components/TaskGroupsTab.vue'
import AnnouncementsTab from '../components/AnnouncementsTab.vue'
import MembersTab from '../components/MembersTab.vue'
import DeleteTeamTab from '../components/DeleteTeamTab.vue'

const { getUserByAccessToken } = AuthStore
const { 
  addTeamToCache, 
  updateTeamAccess, 
  removeTeamFromCache, 
  getTeamComponentKey,
  needsRefresh,
  markAsRefreshed,
  isTeamCacheValid,
  cleanExpiredCache,
  getCacheStats 
} = useComponentCache()

const route = useRoute()
const router = useRouter()
const currentInstance = getCurrentInstance()

// Using structured Permission object for cleaner permission checks
const userPermissions = ref({})

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const team = ref({
  teamId: '',
  title: '',
  description: '',
  category: '',
})

const userLoaded = ref(false)
const isLoadingTasks = ref(true)
const isLoadingAnnouncements = ref(true)
const isLoadingMembers = ref(true)
const isLoadingTeamDetails = ref(true)
const newTaskDialog = ref(false)
const roleUpdateTrigger = ref(0)

const viewAnnouncementDialog = ref(false)
const deleteAnnouncementDialog = ref(false)
const updateAnnouncementDialog = ref(false)
const newAnnouncementsDialog = ref(false)
const taskSubmissionDialog = ref(false)
const deleteMembersDialog = ref(false)
const addMembersDialog = ref(false)
const updateTaskGroupDialog = ref(false)
const roleManagementDialog = ref(false)

const selectedTaskForSubmission = ref(null)
const selectedAnnouncementForDeletion = ref(null)
const announcementToEdit = ref(null)
const announcementToView = ref(null)
const selectedTaskGroupId = ref(null)

const tasks = ref([])
const announcements = ref([])
const teamMembers = ref([])
const subTeams = ref([])
const taskGroups = ref([])
const refreshingTaskGroups = ref(false)

// Delete team functionality
const isLoadingSubTeams = ref(false)
const deleteConfirmationText = ref('')
const deleteConfirmationChecked = ref(false)
const isDeletingTeam = ref(false)

// Tasks filtering and pagination
const taskSearchQuery = ref('')
const taskTagSearchQuery = ref('')
const taskFilterType = ref('all') // 'all', 'not-submitted', 'pending'
const taskCurrentPage = ref(1)
const taskItemsPerPage = 6

// Members search and filtering
const memberSearchQuery = ref('')

const activeTab = ref(route.query.tab || 'tasks')

// Get team ID from route params
const teamId = ref(route.params.teamId)
const componentKey = ref(null)

// Reactive computed properties for permissions to ensure Vue reactivity
const canViewTaskGroup = computed(() => {
  return userPermissions.value?.canViewTaskGroup === true || permissionService.isAdmin()
})

const canViewAnnouncements = computed(() => {
  return userPermissions.value?.canViewAnnouncements === true || permissionService.isAdmin()
})

const canViewMembers = computed(() => {
  return userPermissions.value?.canViewMembers === true || permissionService.isAdmin()
})

const isAdmin = computed(() => {
  return permissionService.isAdmin()
})

const canManageTasks = computed(() => {
  return userPermissions.value?.canManageTasks === true || permissionService.isAdmin()
})

const canManageAnnouncements = computed(() => {
  return userPermissions.value?.canManageAnnouncements === true || permissionService.isAdmin()
})

const canAddMembers = computed(() => {
  return userPermissions.value?.canAddMembers === true || permissionService.isAdmin()
})

const canRemoveMembers = computed(() => {
  return userPermissions.value?.canRemoveMembers === true || permissionService.isAdmin()
})
const isFromCache = ref(false)

// Internal cache for team data to handle multiple teams within the same component instance
const teamDataCache = ref(new Map())

const teamNotFound = ref(false)

// Internal team data caching methods
const getCachedTeamData = (id) => {
  const cached = teamDataCache.value.get(id)
  return cached
}

const setCachedTeamData = (id, data) => {
  teamDataCache.value.set(id, {
    ...data,
    lastAccessed: Date.now()
  })
  updateTeamAccess(id)
}

// Update cache with current team data
const updateCacheWithCurrentData = () => {
  if (!teamId.value) return
  
  setCachedTeamData(teamId.value, {
    user: { ...user.value },
    team: { ...team.value },
    tasks: [...tasks.value],
    announcements: [...announcements.value],
    teamMembers: [...teamMembers.value],
    subTeams: [...subTeams.value],
    taskGroups: [...taskGroups.value],
    userPermissions: { ...userPermissions.value },
    activeTab: activeTab.value
  })
}

const loadFromInternalCache = (id) => {
  // Check if external cache is still valid first
  if (!isTeamCacheValid(id)) {
    teamDataCache.value.delete(id)
    return false
  }
  
  const cached = getCachedTeamData(id)
  if (cached) {
    // Restore all the reactive data from cache
    user.value = cached.user || user.value
    team.value = cached.team || team.value
    tasks.value = cached.tasks || []
    announcements.value = cached.announcements || []
    teamMembers.value = cached.teamMembers || []
    subTeams.value = cached.subTeams || []
    taskGroups.value = cached.taskGroups || []
    userPermissions.value = cached.userPermissions || {}
    activeTab.value = cached.activeTab || route.query.tab || 'tasks'
    
    // Set loading states to false
    isLoadingTasks.value = false
    isLoadingAnnouncements.value = false
    isLoadingMembers.value = false
    isLoadingTeamDetails.value = false
    isLoadingSubTeams.value = false
    refreshingTaskGroups.value = false
    
    // Restore permission service state
    if (cached.userPermissions) {
      permissionService.setUserActions(cached.userPermissions)
    }
    
    updateTeamAccess(id)
    return true
  }
  return false
}

// Setup dynamic component caching
const setupComponentCaching = () => {
  if (!teamId.value) return
  
  // Add this team to the external cache tracking
  addTeamToCache(teamId.value)
  
  // Check if we have internal cached data for this team
  const hasCachedData = getCachedTeamData(teamId.value)
  if (hasCachedData) {
    isFromCache.value = true
  } else {
    isFromCache.value = false
  }
}

// Function to initialize/reload team data
const initializeTeamData = async (forceRefresh = false) => {
  // This function always loads fresh data from API
  // Cache checks should be done before calling this function

  // Set all loading states to true
  isLoadingTasks.value = true
  isLoadingAnnouncements.value = true
  isLoadingMembers.value = true
  isLoadingTeamDetails.value = true
  teamNotFound.value = false

  const userFromToken = await getUserByAccessToken()
  if (userFromToken) {
    setUserToUserToken(userFromToken)
    await fetchTeamTasks()
    await fetchTeamDetails()
    await fetchSubTeams()
    await fetchAnnouncements()
    await fetchTeamMembers()
    await getTaskGroups()
    await fetchUserPermissions()

    // Update role-based flags
    updateRoleFlags()

    // Check if team exists
    if (!team.value || !team.value.teamId) {
      // teamNotFound.value = true
      userLoaded.value = true
      return
    }

    // Check if user is a member of the team or is global admin
    if (
      teamMembers.value.some((member) => member.userId === user.value.userId) ||
      user.value.username === 'admin'
    ) {
      console.log('User is a member of the team or has admin access:', teamId.value)
    } else {
      console.log('User is not a member of the team and is not admin:', teamId.value)
      // Show not found if not a member and not admin
      teamNotFound.value = true
      userLoaded.value = true
      return
    }
    
    // Cache the loaded data once after all fetches complete
    updateCacheWithCurrentData()
    
    // Mark as successfully loaded from API
    isFromCache.value = false
    updateTeamAccess(teamId.value)
    userLoaded.value = true
    

  } else {
    teamNotFound.value = true
    userLoaded.value = true
  }
}

// Watch for route parameter changes
watch(
  () => route.params.teamId,
  async (newTeamId, oldTeamId) => {
    if (newTeamId && newTeamId !== oldTeamId) {

      teamId.value = newTeamId
      
      // Setup caching for the new team
      setupComponentCaching()
      
      // Check if this team has valid cached data
      // Reset loading state immediately for route changes
      userLoaded.value = false
      
      const hasCachedData = getCachedTeamData(newTeamId)
      const externalCacheValid = isTeamCacheValid(newTeamId)
      
      if (hasCachedData && externalCacheValid) {
        // Load from cache immediately
        if (loadFromInternalCache(newTeamId)) {
          userLoaded.value = true
        } else {
          // Cache load failed, initialize fresh data
          permissionService.setUserActions({})
          userPermissions.value = {}
          await initializeTeamData()
        }
      } else {
        // If no valid cache or cache load failed, initialize fresh data
        // Reset permission service state for new team
        permissionService.setUserActions({})
        userPermissions.value = {}
        
        // Initialize data for new team
        await initializeTeamData()
      }
    }
  },
  { immediate: false },
)

// Watch for tab changes and update URL
watch(
  () => activeTab.value,
  async (newTab) => {
    if (newTab && route.query.tab !== newTab) {
      router.push({
        path: route.path,
        query: { ...route.query, tab: newTab },
      })
    }

    // Fetch sub-teams when delete-team tab is activated
    if (newTab === 'delete-team') {
      console.log('Delete team tab activated, fetching sub-teams...')
      await fetchSubTeams()
    }
  },
)

// Watch for URL query parameter changes
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && newTab !== activeTab.value) {
      activeTab.value = newTab
    }
  },
  { immediate: true }, // Run immediately to sync with initial URL
)

// Watch for team title changes to update document title
watch(
  () => team.value.title,
  (newTitle) => {
    if (newTitle) {
      document.title = `${newTitle} | Team Details`
    }
  },
  { immediate: true },
)

onMounted(async () => {

  
  // Setup component caching for initial team
  setupComponentCaching()
  
  // Set default tab parameter if not present
  if (!route.query.tab) {
    router.replace({
      path: route.path,
      query: { ...route.query, tab: 'tasks' },
    })
  }
  
  // Check if we have valid cached data and load it immediately
  const hasCachedData = getCachedTeamData(teamId.value)
  const externalCacheValid = isTeamCacheValid(teamId.value)
  

  
  if (hasCachedData && externalCacheValid) {

    if (loadFromInternalCache(teamId.value)) {
      userLoaded.value = true
    } else {

      await initializeTeamData()
    }
  } else if (!userLoaded.value) {

    await initializeTeamData()
  } else {

  }
})

// Keep-alive lifecycle hooks for cache management
onActivated(async () => {

  
  // Check if external cache is valid first
  const externalCacheValid = isTeamCacheValid(teamId.value)
  const hasCachedData = getCachedTeamData(teamId.value)
  
  if (!externalCacheValid && hasCachedData) {
    // External cache expired, remove internal cache too

    teamDataCache.value.delete(teamId.value)
  }
  
  // Re-check cache data after cleanup
  const refreshedCachedData = getCachedTeamData(teamId.value)
  
  if (refreshedCachedData && externalCacheValid && !userLoaded.value) {

    if (loadFromInternalCache(teamId.value)) {
      userLoaded.value = true
    } else {

      await initializeTeamData()
    }
  } else if (!userLoaded.value) {
    // If no valid cached data and not loaded, initialize

    await initializeTeamData()
  }
  
  // Update access time when component is activated
  if (teamId.value && externalCacheValid) {
    updateTeamAccess(teamId.value)
  }
  
  // Log cache statistics for debugging

})

onDeactivated(() => {

  
  // Component is being cached, no cleanup needed
  // The data remains intact for next activation
})

const setUserToUserToken = (userToken) => {

  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const fetchUserPermissions = async () => {
  try {
    // Use permission service to fetch and set actions
    await permissionService.fetchUserActions(teamId.value, user.value.userId)
    userPermissions.value = permissionService.userActions
    // Update cache after fetching permissions
    updateCacheWithCurrentData()
  } catch (error) {
    console.log('Error fetching user permissions:', error)
    userPermissions.value = {}
  }
}

const fetchSubTeams = async () => {
  try {
    isLoadingSubTeams.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams/${teamId.value}/sub-teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!ok) {
      console.log('Failed to fetch sub-teams. Status:', status, 'Error:', data)
      subTeams.value = []
      return
    }

    // Handle both array and object responses
    if (Array.isArray(data)) {
      subTeams.value = data
    } else if (data.subTeams && Array.isArray(data.subTeams)) {
      subTeams.value = data.subTeams
    } else {
      console.warn('Unexpected sub-teams response format:', data)
      subTeams.value = []
    }
    
    // Update cache after fetching sub-teams
    updateCacheWithCurrentData()

  } catch (error) {
    console.log('Failed to fetch sub-teams:', error)
    subTeams.value = []
  } finally {
    isLoadingSubTeams.value = false
  }
}

const updateRoleFlags = () => {
  // Role flags are now handled by the permission service
  // Keep for backward compatibility if needed elsewhere
  const userRole =
    userPermissions.value.roleLabel || userPermissions.value.baseRole || 'Member'

}

const fetchTeamTasks = async () => {
  try {
    isLoadingTasks.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(
      `${PORT}/api/teams/${teamId.value}/${user.value.userId}/tasks`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!ok) {
      console.log('Failed to fetch team tasks:', data?.message || `Status ${status}`)
      tasks.value = []
    } else {
      // Extract the tasks array from the response object
      tasks.value = data.tasks || []
      // Update cache after fetching tasks
      updateCacheWithCurrentData()
    }
  } catch (error) {
    console.log('Failed to fetch team tasks:', error)
    tasks.value = []
  } finally {
    isLoadingTasks.value = false
  }
}

const fetchTeamDetails = async () => {
  try {
    isLoadingTeamDetails.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams/${teamId.value}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!ok) {
      console.log('Failed to fetch team details:', data?.message || `Status ${status}`)
      team.value = {}
    } else {
      team.value = data.team || {}
      // Update cache after fetching team details
      updateCacheWithCurrentData()
    }
  } catch (error) {
    console.log('Failed to fetch team details:', error)
  } finally {
    isLoadingTeamDetails.value = false
  }
}

const fetchAnnouncements = async () => {
  try {
    isLoadingAnnouncements.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams/${teamId.value}/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!ok) {
      console.log('Failed to fetch announcements:', data?.message || `Status ${status}`)
      announcements.value = []
    } else {
      announcements.value = data.announcements || []
      // Update cache after fetching announcements
      updateCacheWithCurrentData()
    }
  } catch (error) {
    console.log('Failed to fetch announcements:', error)
  } finally {
    isLoadingAnnouncements.value = false
  }
}

const fetchTeamMembers = async () => {
  try {
    isLoadingMembers.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams/${teamId.value}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!ok) {
      console.log('Failed to fetch team members:', data?.message || `Status ${status}`)
      teamMembers.value = []
    } else {
      teamMembers.value = data
      // Update cache after fetching team members
      updateCacheWithCurrentData()
    }
  } catch (error) {
    console.log('Failed to fetch team members:', error)
  } finally {
    isLoadingMembers.value = false
  }
}

// Handle roles updated - refresh team members and update role trigger for NewMembers
const handleRolesUpdated = async () => {
  isLoadingMembers.value = true
  await fetchTeamMembers()
  roleUpdateTrigger.value += 1 // Increment trigger to update role list in NewMembers
}

// Force refresh team data and invalidate cache
const forceRefreshTeamData = async () => {

  
  // Remove from cache
  teamDataCache.value.delete(teamId.value)
  removeTeamFromCache(teamId.value)
  
  // Re-add to cache and initialize fresh data
  setupComponentCaching()
  userLoaded.value = false
  await initializeTeamData(true)
}

const editAnnnouncement = (announcementId) => {
  // Logic to edit the announcement
  console.log('Edit announcement withId:', announcementId)
  announcementToEdit.value = announcements.value.find(
    (announcement) => announcement._id === announcementId,
  )
  if (announcementToEdit.value) {
    updateAnnouncementDialog.value = true
    selectedTaskForSubmission.value = announcementToEdit.value
  } else {
    console.log('Announcement not found with ID:', announcementId)
  }
  updateAnnouncementDialog.value = true
}

const deleteAnnouncement = (announcementId) => {
  if (announcements.value.find((announcement) => announcement._id === announcementId)) {
    selectedAnnouncementForDeletion.value = announcementId
    console.log('Selected announcement for deletion:', selectedAnnouncementForDeletion.value)
  } else {
    console.log('Announcement not found with ID:', announcementId)
  }
  deleteAnnouncementDialog.value = true
}

const viewAnnouncement = (announcementId) => {
  // Logic to view the announcement
  console.log('View announcement with ID:', announcementId)
  announcementToView.value = announcements.value.find(
    (announcement) => announcement._id === announcementId,
  )
  if (announcementToView.value) {
    viewAnnouncementDialog.value = true
  } else {
    console.log('Announcement not found with ID:', announcementId)
  }
}

const toggleLikeAnnouncement = async (announcementId) => {
  // Logic to like the announcement
  console.log('Like announcement with ID:', announcementId)
  // Here you would typically send a request to the server to like the announcement

  const PORT = import.meta.env.VITE_API_PORT
  try {
    const { ok, status, data } = await fetchJSON(`${PORT}/api/announcements/${announcementId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user.value.userId }),
    })

    if (!ok) {
      throw new Error(data?.message || `Failed to like announcement (Status ${status})`)
    } else {
      // Soft update the local state to reflect the like
      const currentAnnouncement = announcements.value.find(
        (announcement) => announcement._id === announcementId,
      )
      if (currentAnnouncement.likeUsers.includes(user.value.userId)) {
        // User has already liked the announcement, so we remove their like
        currentAnnouncement.likeUsers = currentAnnouncement.likeUsers.filter(
          (userId) => userId !== user.value.userId,
        )
      } else {
        // User has not liked the announcement, so we add their like
        currentAnnouncement.likeUsers.push(user.value.userId)
      }
      // Update cache after like/unlike
      updateCacheWithCurrentData()
    }
  } catch (error) {
    console.log('Error liking announcement:', error)
  }
}

const getTaskGroups = async () => {
  try {
    refreshingTaskGroups.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams/${teamId.value}/task-groups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!ok) {
      console.log('Failed to fetch task groups:', data?.message || `Status ${status}`)
      taskGroups.value = []
    } else {
      console.log('Task groups ', data.taskGroups)
      taskGroups.value = data.taskGroups || []
      console.log('Fetched task groups:', taskGroups.value)
      // Update cache after fetching task groups
      updateCacheWithCurrentData()
    }
  } catch (error) {
    console.log('Failed to fetch task groups:', error)
  } finally {
    refreshingTaskGroups.value = false
  }
}

const goBackToTeams = () => {
  router.push('/teams')
}

const submitTask = (taskId) => {
  // Find the task with the given ID
  const task = tasks.value.find((t) => t._id === taskId)
  if (task) {
    console.log('Selected task for submission:', task)
    selectedTaskForSubmission.value = task
    taskSubmissionDialog.value = true
  } else {
    console.log('Task not found with ID:', taskId)
  }
}

const openTaskGroupDialog = (taskGroupId) => {
  selectedTaskGroupId.value = taskGroupId
  updateTaskGroupDialog.value = true
}

const taskFilterOptions = [
  { title: 'All Tasks', value: 'all' },
  { title: 'Pending Tasks', value: 'pending' },
  { title: 'Not Submitted', value: 'not-submitted' },
]

// Computed property for delete team validation
const canDeleteTeam = computed(() => {
  return deleteConfirmationText.value === team.value.title && deleteConfirmationChecked.value
})

// Method to confirm and execute team deletion
const confirmDeleteTeam = async () => {
  if (!canDeleteTeam.value) return

  try {
    isDeletingTeam.value = true

    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamId: teamId.value,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to delete team')
    }

    // Remove from cache since team no longer exists
    removeTeamFromCache(teamId.value)

    // Success - redirect to teams page with success message
    router.push({
      path: '/teams',
      query: { message: 'Team deleted successfully', type: 'success' },
    })
  } catch (error) {
    console.log('Error deleting team:', error)
    // You might want to show a toast/snackbar error message here
    alert('Failed to delete team. Please try again.')
  } finally {
    isDeletingTeam.value = false
  }
}

// Utility method for manual cache management (useful for debugging)
const refreshTeamData = async () => {

  await initializeTeamData(true)
}

// Development mode check
const isDev = computed(() => {
  const customDev = import.meta.env.VITE_DEV
  if (customDev !== undefined) {
    return customDev === 'true'
  }
  return false
})
</script>

<template>
  <v-container fluid>
    <!-- Loading state for entire page -->
    <div v-if="!userLoaded">
      <!-- Header skeleton -->
      <v-row class="align-center">
        <v-col cols="auto">
          <v-skeleton-loader type="button" width="40px" height="40px"></v-skeleton-loader>
        </v-col>
        <v-col>
          <v-skeleton-loader type="heading" width="300px" class="mb-2"></v-skeleton-loader>
          <v-skeleton-loader type="text" width="400px"></v-skeleton-loader>
        </v-col>
      </v-row>

      <!-- Tabs skeleton -->
      <v-row class="align-center mb-6 mt-6">
        <v-col cols="12">
          <v-skeleton-loader type="chip@5" class="mb-4"></v-skeleton-loader>
          <v-row class="mt-4">
            <v-col cols="12" md="6" lg="4">
              <v-skeleton-loader type="button" height="56px" class="w-100"></v-skeleton-loader>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Content skeleton -->
      <v-row>
        <v-col v-for="n in 6" :key="`skeleton-${n}`" cols="12" md="6" lg="4">
          <v-card class="mb-4 elevation-2">
            <v-card-item>
              <v-skeleton-loader type="list-item-two-line"></v-skeleton-loader>
            </v-card-item>
            <v-card-text>
              <v-skeleton-loader type="paragraph"></v-skeleton-loader>
              <v-skeleton-loader type="text" width="100px" class="mb-2"></v-skeleton-loader>
              <div class="d-flex justify-space-between">
                <v-skeleton-loader type="text" width="80px"></v-skeleton-loader>
                <v-skeleton-loader type="text" width="80px"></v-skeleton-loader>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-skeleton-loader type="chip" width="100px"></v-skeleton-loader>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Team Not Found State (keep sidebar visible) -->
    <div v-else-if="teamNotFound">
      <NotFound />
    </div>

    <!-- Actual content when loaded and team exists -->
    <div v-else>
      <!-- Header with back button -->
      <v-row class="align-center">
        <v-col cols="auto">
          <v-btn icon @click="goBackToTeams" variant="text">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
        </v-col>
        <v-col cols="auto" v-if="isDev">
          <v-btn 
            icon 
            @click="refreshTeamData" 
            variant="text"
            :loading="isLoadingTeamDetails"
            color="primary"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </v-col>
        <v-col>
          <div v-if="isLoadingTeamDetails">
            <v-skeleton-loader type="heading" width="300px" class="mb-2"></v-skeleton-loader>
            <v-skeleton-loader type="text" width="400px"></v-skeleton-loader>
          </div>
          <div v-else>
            <div class="d-flex align-center mb-2">
              <h1 class="text-h4 font-weight-bold">{{ team.title }}</h1>
              <!-- Cache indicator for development -->
              <v-chip 
                v-if="isFromCache && isDev" 
                color="success" 
                size="x-small" 
                class="ml-2"
                variant="outlined"
              >
                <v-icon start size="x-small">mdi-cached</v-icon>
                Cached
              </v-chip>
            </div>
            <p class="text-grey">{{ team.description }}</p>
          </div>
        </v-col>
      </v-row>

      <!-- New Tasks Dialog -->
      <NewTasks
        v-if="userLoaded"
        v-model:dialog="newTaskDialog"
        :userProps="user"
        :teamId="teamId"
        :teamMembers="teamMembers"
        @create-task="fetchTeamTasks"
      />

      <!-- New Announcements Dialog -->
      <NewAnnouncements
        v-if="userLoaded"
        v-model:dialog="newAnnouncementsDialog"
        v-model:userProps="user"
        v-model:teamId="teamId"
        v-model:announcements="announcements"
        @announcement-created="fetchAnnouncements"
      />

      <!-- Edit Announcement Dialog -->
      <UpdateAnnouncements
        v-if="userLoaded && updateAnnouncementDialog"
        v-model:dialog="updateAnnouncementDialog"
        v-model:userProps="user"
        v-model:teamId="teamId"
        @announcement-updated="fetchAnnouncements"
        @close-dialog="updateAnnouncementDialog = false"
        v-model:announcement="announcementToEdit"
      />

      <!-- Delete Announcement Dialog -->
      <DeleteAnnouncements
        v-if="userLoaded && deleteAnnouncementDialog"
        v-model:dialog="deleteAnnouncementDialog"
        v-model:announcementId="selectedAnnouncementForDeletion"
        :teamId="teamId"
        @announcement-deleted="fetchAnnouncements"
      />

      <!-- View Announcement Dialog -->
      <AnnouncementView
        v-if="userLoaded && viewAnnouncementDialog"
        v-model:dialog="viewAnnouncementDialog"
        v-model:announcement="announcementToView"
        v-model:userProps="user"
        v-model:teamId="teamId"
        @close-dialog="viewAnnouncementDialog = false"
        @announcement-updated="fetchAnnouncements"
      />

      <!-- Task Submission Dialog -->
      <TaskSubmission
        v-if="userLoaded && selectedTaskForSubmission"
        v-model:dialog="taskSubmissionDialog"
        v-model:userProps="user"
        v-model:teamId="teamId"
        v-model:taskId="selectedTaskForSubmission._id"
        v-model:task="selectedTaskForSubmission"
        @submission-success="fetchTeamTasks"
      />

      <NewMembers
        v-if="userLoaded"
        v-model:dialog="addMembersDialog"
        :userProps="user"
        :teamId="teamId"
        :teamMembers="teamMembers"
        :roleUpdateTrigger="roleUpdateTrigger"
        :allowCustomRoleSelection="permissionService.canManageCustomRoles()"
        @members-added="fetchTeamMembers"
      />
      <!-- Delete Members Dialog -->
      <DeleteMembers
        v-if="userLoaded"
        v-model:dialog="deleteMembersDialog"
        :userProps="user"
        :members="teamMembers"
        :teamId="teamId"
        @members-removed="fetchTeamMembers"
      />

      <!-- Update Task Groups Dialog -->
      <UpdateTaskGroups
        v-if="userLoaded && updateTaskGroupDialog"
        v-model:dialog="updateTaskGroupDialog"
        v-model:taskGroupId="selectedTaskGroupId"
        v-model:teamId="teamId"
        v-model:userProps="user"
        v-model:teamMembers="teamMembers"
        @task-group-updated="getTaskGroups"
      />

      <!-- Role Management Dialog -->
      <RoleManagement
        v-if="userLoaded && roleManagementDialog"
        v-model:dialog="roleManagementDialog"
        :userProps="user"
        :teamId="teamId"
        :teamMembers="teamMembers"
        @roles-updated="handleRolesUpdated"
      />

      <!-- Team navigation tabs with action buttons -->
      <v-row class="align-center mb-6">
        <v-col cols="12">
          <v-tabs v-model="activeTab" align-tabs="start">
            <v-tab value="tasks">
              <v-icon start>mdi-clipboard-text</v-icon>
              Tasks
            </v-tab>
            <v-tab value="workflow">
              <v-icon start>mdi-timeline-clock</v-icon>
              Workflow
            </v-tab>
            <v-tab value="task-groups" v-if="canViewTaskGroup">
              <v-icon start>mdi-folder-multiple</v-icon>
              Task Groups
            </v-tab>
            <v-tab value="announcements" v-if="canViewAnnouncements">
              <v-icon start>mdi-bullhorn</v-icon>
              Announcements
            </v-tab>
            <v-tab value="members" v-if="canViewMembers">
              <v-icon start>mdi-account-group</v-icon>
              Members
            </v-tab>
            <v-tab value="roles" v-if="isAdmin">
              <v-icon start>mdi-account-key</v-icon>
              Roles
            </v-tab>
            <v-tab value="delete-team" v-if="isAdmin">
              <v-icon start>mdi-delete</v-icon>
              Delete Team
            </v-tab>
          </v-tabs>

          <!-- Action buttons row based on active tab -->
          <v-row class="mt-4">
            <!-- Tasks tab actions -->
            <v-col cols="12" md="6" lg="4" v-if="activeTab === 'tasks' && canManageTasks">
            </v-col>

            <!-- Announcements tab actions -->
            <v-col
              cols="12"
              md="6"
              lg="4"
              v-if="activeTab === 'announcements' && canManageAnnouncements"
            >
              <v-btn
                v-tooltip:bottom="'Add new announcement'"
                @click="newAnnouncementsDialog = !newAnnouncementsDialog"
                color="success"
                class="w-100 project-card rounded-lg font-weight-bold"
                size="large"
                variant="outlined"
              >
                <v-icon start>mdi-bullhorn</v-icon>
                Add New Announcement
              </v-btn>
            </v-col>

            <template v-if="activeTab === 'members'">
              <v-col cols="12" md="6" lg="4" v-if="canAddMembers">
                <v-btn
                  v-tooltip:bottom="'Add team members'"
                  @click="addMembersDialog = true"
                  color="success"
                  class="w-100 project-card rounded-lg font-weight-bold"
                  size="large"
                  variant="outlined"
                >
                  <v-icon start>mdi-account-plus</v-icon>
                  Add Members
                </v-btn>
              </v-col>
              <v-col cols="12" md="6" lg="4" v-if="canRemoveMembers">
                <v-btn
                  v-tooltip:bottom="'Remove team members'"
                  @click="deleteMembersDialog = true"
                  color="error"
                  class="w-100 project-card rounded-lg font-weight-bold"
                  size="large"
                  variant="outlined"
                >
                  <v-icon start>mdi-account-remove</v-icon>
                  Remove Members
                </v-btn>
              </v-col>
            </template>
          </v-row>
        </v-col>
      </v-row>

      <!-- Tab content -->
      <v-window v-model="activeTab">
        <!-- Tasks Tab -->
        <v-window-item value="tasks">
          <TasksTab
            :is-loading="isLoadingTasks"
            :user-loaded="userLoaded"
            :tasks="tasks"
            :user="user"
            v-model:task-search-query="taskSearchQuery"
            v-model:task-tag-search-query="taskTagSearchQuery"
            v-model:task-filter-type="taskFilterType"
            v-model:task-current-page="taskCurrentPage"
            :task-items-per-page="taskItemsPerPage"
            :task-filter-options="taskFilterOptions"
            @submit-task="submitTask"
          />
        </v-window-item>

        <!-- Workflow Tab -->
        <v-window-item value="workflow">
          <WorkflowTab
            :task-groups="taskGroups"
            :refreshing-task-groups="refreshingTaskGroups"
            @refresh-task-groups="getTaskGroups"
          />
        </v-window-item>

        <!-- Task Groups Tab -->
        <v-window-item value="task-groups" v-if="canViewTaskGroup">
          <TaskGroupsTab
            :task-groups="taskGroups"
            :refreshing-task-groups="refreshingTaskGroups"
            v-model:new-task-dialog="newTaskDialog"
            @refresh-task-groups="getTaskGroups"
            @open-task-group-dialog="openTaskGroupDialog"
          />
        </v-window-item>

        <!-- Announcements Tab -->
        <v-window-item value="announcements">
          <AnnouncementsTab
            :is-loading="isLoadingAnnouncements"
            :announcements="announcements"
            :user="user"
            @toggle-like="toggleLikeAnnouncement"
            @view-announcement="viewAnnouncement"
            @edit-announcement="editAnnnouncement"
            @delete-announcement="deleteAnnouncement"
          />
        </v-window-item>

        <!-- Members Tab -->
        <v-window-item value="members">
          <MembersTab
            :is-loading="isLoadingMembers"
            :team-members="teamMembers"
            v-model:member-search-query="memberSearchQuery"
          />
        </v-window-item>

        <!-- Management Tab -->
        <v-window-item value="roles" v-if="canAddMembers || canRemoveMembers || isAdmin">
          <RoleManagementTabs
            :teamId="teamId"
            :userProps="user"
            :teamMembers="teamMembers"
            @roles-updated="handleRolesUpdated"
          />
        </v-window-item>

        <!-- Delete Team Tab -->
        <v-window-item value="delete-team" v-if="isAdmin">
          <DeleteTeamTab
            :team="team"
            :sub-teams="subTeams"
            :team-members="teamMembers"
            :tasks="tasks"
            :is-loading-sub-teams="isLoadingSubTeams"
            v-model:delete-confirmation-text="deleteConfirmationText"
            v-model:delete-confirmation-checked="deleteConfirmationChecked"
            :is-deleting-team="isDeletingTeam"
            :can-delete-team="canDeleteTeam"
            @fetch-sub-teams="fetchSubTeams"
            @confirm-delete-team="confirmDeleteTeam"
            @go-back-to-teams="goBackToTeams"
          />
        </v-window-item>
      </v-window>
    </div>
  </v-container>
</template>

<style scoped>
/* Scroll-X Transition Styles */
.scroll-x-enter-active,
.scroll-x-leave-active {
  transition: all 0.6s ease;
}

.scroll-x-enter-from {
  opacity: 0;
  transform: translateX(-100px);
}

.scroll-x-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.scroll-x-enter-to,
.scroll-x-leave-from {
  opacity: 1;
  transform: translateX(0);
}

/* Staggered animation for multiple items */
.scroll-x-move {
  transition: transform 0.6s ease;
}

/* Skeleton Loading Styles */
.v-skeleton-loader {
  background: transparent;
}

.v-skeleton-loader .v-skeleton-loader__bone {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
