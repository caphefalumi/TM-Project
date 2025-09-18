<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import { permissionService, usePermissions } from '../services/permissionService.js'
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
import WorkflowView from '../components/WorkflowView.vue'

const { getUserByAccessToken } = AuthStore

const route = useRoute()
const router = useRouter()

// Use permission composables
const {
  hasPermission,
  isAdmin,
  getRoleIcon,
  getRoleColor,
  canAccessAnnouncements,
  canAccessMembers,
  canAddTeamMembers,
  canCustomizeRolesForNewMembers,
} = usePermissions()

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

// Computed properties for permissions - using centralized permission service
const canCreateTasks = computed(() => hasPermission('canManageTasks'))
const canCreateAnnouncements = computed(() => hasPermission('canManageAnnouncements'))
const canManageMembers = computed(
  () => hasPermission('canAddMembers') || hasPermission('canRemoveMembers'),
)
const canManageTaskGroups = computed(() => hasPermission('canViewTaskGroups'))
const canEditAnnouncements = computed(() => hasPermission('canManageAnnouncements'))

// UI Feature Access - Users see features only if they have at least one permission from the group
const showAnnouncementsFeature = computed(() => canAccessAnnouncements())
const showMembersFeature = computed(() => canAccessMembers())
const showAddMembersButton = computed(() => canAddTeamMembers())
const allowCustomRoleSelection = computed(() => canCustomizeRolesForNewMembers())

// Function to initialize/reload team data
const initializeTeamData = async () => {
  // Set all loading states to true
  isLoadingTasks.value = true
  isLoadingAnnouncements.value = true
  isLoadingMembers.value = true
  isLoadingTeamDetails.value = true

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

    // Check if user is a member of the team or is global admin
    if (
      teamMembers.value.some((member) => member.userId === user.value.userId) ||
      user.value.username === 'admin'
    ) {
      console.log('User is a member of the team or has admin access:', teamId.value)
    } else {
      console.error('User is not a member of the team and is not admin:', teamId.value)
      // Redirect to home if not a member and not admin
      userLoaded.value = false
      router.push('/home')
      return
    }
    userLoaded.value = true
  } else {
    router.push('/')
  }
}

// Watch for route parameter changes
watch(
  () => route.params.teamId,
  (newTeamId) => {
    if (newTeamId) {
      teamId.value = newTeamId
      // Reset state before loading new team data
      userLoaded.value = false
      userPermissions.value = {}
      // Reset permission service state
      permissionService.setPermissions({})
      initializeTeamData()
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

onMounted(async () => {
  // Set default tab parameter if not present
  if (!route.query.tab) {
    router.replace({
      path: route.path,
      query: { ...route.query, tab: 'tasks' },
    })
  }
  await initializeTeamData()
})

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const fetchUserPermissions = async () => {
  try {
    // Use permission service to fetch and set permissions
    await permissionService.fetchUserPermissions(teamId.value, user.value.userId)
    userPermissions.value = permissionService.userPermissions
    console.log('User permissions:', userPermissions.value)
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    userPermissions.value = {}
  }
}

const fetchSubTeams = async () => {
  try {
    isLoadingSubTeams.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}/sub-teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch sub-teams. Status:', response.status, 'Error:', errorData)
      subTeams.value = []
      return
    }

    const data = await response.json()
    console.log('Fetched sub-teams raw response:', data)

    // Handle both array and object responses
    if (Array.isArray(data)) {
      subTeams.value = data
    } else if (data.subTeams && Array.isArray(data.subTeams)) {
      subTeams.value = data.subTeams
    } else {
      console.warn('Unexpected sub-teams response format:', data)
      subTeams.value = []
    }
    console.log('Sub-teams after processing:', subTeams.value.length, 'teams found')
  } catch (error) {
    console.error('Failed to fetch sub-teams:', error)
    subTeams.value = []
  } finally {
    isLoadingSubTeams.value = false
  }
}

const updateRoleFlags = () => {
  // Role flags are now handled by the permission service
  // Keep for backward compatibility if needed elsewhere
  const userRole = userPermissions.value.role || 'Member'
  console.log('Role flags updated:', {
    isAdmin: isAdmin(),
    role: userRole,
  })
}

const fetchTeamTasks = async () => {
  try {
    isLoadingTasks.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      // '/api/teams/:teamId/:userId/tasks'
      `${PORT}/api/teams/${teamId.value}/${user.value.userId}/tasks`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Failed to fetch team tasks:', data.message)
      tasks.value = []
    } else {
      // Extract the tasks array from the response object
      tasks.value = data.tasks || []
      console.log('Fetched team tasks:', tasks.value)
    }
  } catch (error) {
    console.error('Failed to fetch team tasks:', error)
    tasks.value = []
  } finally {
    isLoadingTasks.value = false
  }
}

const fetchTeamDetails = async () => {
  try {
    isLoadingTeamDetails.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Failed to fetch team details:', data.message)
      team.value = {}
    } else {
      team.value = data.team || {}
      console.log('Fetched team details:', team.value)
    }
  } catch (error) {
    console.error('Failed to fetch team details:', error)
  } finally {
    isLoadingTeamDetails.value = false
  }
}

const fetchAnnouncements = async () => {
  try {
    isLoadingAnnouncements.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('Announcements response:', data)
    if (!response.ok) {
      console.error('Failed to fetch announcements:', data.message)
      announcements.value = []
    } else {
      announcements.value = data.announcements || []
      console.log('Fetched team announcements:', announcements.value)
    }
  } catch (error) {
    console.error('Failed to fetch announcements:', error)
  } finally {
    isLoadingAnnouncements.value = false
  }
}

const fetchTeamMembers = async () => {
  try {
    isLoadingMembers.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    if (!response.ok) {
      console.error('Failed to fetch team members:')
      teamMembers.value = []
    } else {
      teamMembers.value = result
      console.log('Fetched team members:', teamMembers.value)
    }
  } catch (error) {
    console.error('Failed to fetch team members:', error)
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
    console.error('Announcement not found with ID:', announcementId)
  }
  updateAnnouncementDialog.value = true
}

const deleteAnnouncement = (announcementId) => {
  if (announcements.value.find((announcement) => announcement._id === announcementId)) {
    selectedAnnouncementForDeletion.value = announcementId
    console.log('Selected announcement for deletion:', selectedAnnouncementForDeletion.value)
  } else {
    console.error('Announcement not found with ID:', announcementId)
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
    console.error('Announcement not found with ID:', announcementId)
  }
}

const toggleLikeAnnouncement = async (announcementId) => {
  // Logic to like the announcement
  console.log('Like announcement with ID:', announcementId)
  // Here you would typically send a request to the server to like the announcement

  const PORT = import.meta.env.VITE_API_PORT
  try {
    const response = await fetch(`${PORT}/api/announcements/${announcementId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user.value.userId }),
    })

    if (!response.ok) {
      throw new Error('Failed to like announcement')
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
    }
  } catch (error) {
    console.error('Error liking announcement:', error)
  }
}

const getTaskGroups = async () => {
  try {
    refreshingTaskGroups.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}/task-groups`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Failed to fetch team details:', data.message)
      taskGroups.value = []
    } else {
      console.log("Task groups ", data.taskGroups)
      taskGroups.value = data.taskGroups || []
      console.log('Fetched task groups:', taskGroups.value)
    }
  } catch (error) {
    console.error('Failed to fetch task groups:', error)
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
    console.error('Task not found with ID:', taskId)
  }
}

const getPriorityColor = (priority) => {
  const colors = {
    Urgent: 'red-darken-2',
    High: 'orange-darken-1',
    Medium: 'green-darken-1',
    Low: 'blue-darken-1',
    Optional: 'grey-darken-3',
  }
  return colors[priority] || 'grey-darken-3'
}

const getLikeColor = (announcement) => {
  return announcement.likeUsers.includes(user.value.userId) ? 'primary' : ''
}

const openTaskGroupDialog = (taskGroupId) => {
  selectedTaskGroupId.value = taskGroupId
  updateTaskGroupDialog.value = true
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Task filtering and pagination computed properties
const filteredAndSortedTasks = computed(() => {
  let filtered = tasks.value

  // Filter by task name search
  if (taskSearchQuery.value) {
    const searchTerm = taskSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter((task) => {
      const taskTitle = task.title.toLowerCase()
      return taskTitle.includes(searchTerm)
    })
  }

  // Filter by tag search
  if (taskTagSearchQuery.value) {
    const tagSearchTerms = taskTagSearchQuery.value.toLowerCase().trim().split(/\s+/)
    filtered = filtered.filter((task) => {
      const taskTags = task.tags ? task.tags.map((tag) => tag.toLowerCase()) : []

      // Check if all search terms match any tag (AND logic for multiple tags)
      return tagSearchTerms.every((term) => {
        return taskTags.some((tag) => tag.includes(term))
      })
    })
  }

  // Filter by task type
  const now = new Date()
  if (taskFilterType.value === 'not-submitted') {
    filtered = filtered.filter((task) => !task.submitted)
  } else if (taskFilterType.value === 'pending') {
    filtered = filtered.filter((task) => {
      const startDate = new Date(task.startDate)
      const dueDate = new Date(task.dueDate)
      return now >= startDate && now <= dueDate
    })
  }

  // Sort by most recently due date (closest due date first)
  return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
})

const paginatedTasks = computed(() => {
  const start = (taskCurrentPage.value - 1) * taskItemsPerPage
  const end = start + taskItemsPerPage
  return filteredAndSortedTasks.value.slice(start, end)
})

const totalTaskPages = computed(() => {
  return Math.ceil(filteredAndSortedTasks.value.length / taskItemsPerPage)
})

// Filtered members based on search query
const filteredMembers = computed(() => {
  if (!memberSearchQuery.value) {
    return teamMembers.value
  }

  const query = memberSearchQuery.value.toLowerCase().trim()

  // If query starts with #, search by role
  if (query.startsWith('#')) {
    const roleQuery = query.slice(1) // Remove the # symbol
    if (!roleQuery) return teamMembers.value // If just # without role name, show all

    return teamMembers.value.filter((member) => {
      // Check custom role first, then base role
      if (member.customRole) {
        return member.customRole.name.toLowerCase().includes(roleQuery)
      }
      return member.role.toLowerCase().includes(roleQuery)
    })
  }

  // Otherwise, search by username
  return teamMembers.value.filter((member) => member.username.toLowerCase().includes(query))
})

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      credentials: 'include', // Important: sends refresh token cookie
      body: JSON.stringify({
        teamId: teamId.value,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to delete team')
    }

    // Success - redirect to teams page with success message
    router.push({
      path: '/teams',
      query: { message: 'Team deleted successfully', type: 'success' },
    })
  } catch (error) {
    console.error('Error deleting team:', error)
    // You might want to show a toast/snackbar error message here
    alert('Failed to delete team. Please try again.')
  } finally {
    isDeletingTeam.value = false
  }
}
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

    <!-- Actual content when loaded -->
    <div v-else>
      <!-- Header with back button -->
      <v-row class="align-center">
        <v-col cols="auto">
          <v-btn icon @click="goBackToTeams" variant="text">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
        </v-col>
        <v-col>
          <div v-if="isLoadingTeamDetails">
            <v-skeleton-loader type="heading" width="300px" class="mb-2"></v-skeleton-loader>
            <v-skeleton-loader type="text" width="400px"></v-skeleton-loader>
          </div>
          <div id="tour-team-header" v-else>
            <h1 class="text-h4 font-weight-bold">{{ team.title }}</h1>
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
        :allowCustomRoleSelection="allowCustomRoleSelection"
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
          <v-tabs id="tour-team-tabs" v-model="activeTab" align-tabs="start">
            <v-tab value="tasks">
              <v-icon start>mdi-clipboard-text</v-icon>
              Tasks
            </v-tab>
            <v-tab value="workflow">
              <v-icon start>mdi-timeline-clock</v-icon>
              Workflow
            </v-tab>
            <v-tab value="task-groups" v-if="canManageTaskGroups">
              <v-icon start>mdi-folder-multiple</v-icon>
              Task Groups
            </v-tab>
            <v-tab value="announcements" v-if="showAnnouncementsFeature">
              <v-icon start>mdi-bullhorn</v-icon>
              Announcements
            </v-tab>
            <v-tab value="members" v-if="showMembersFeature">
              <v-icon start>mdi-account-group</v-icon>
              Members
            </v-tab>
            <v-tab value="roles" v-if="isAdmin()">
              <v-icon start>mdi-account-key</v-icon>
              Roles
            </v-tab>
            <v-tab value="delete-team" v-if="isAdmin()">
              <v-icon start>mdi-delete</v-icon>
              Delete Team
            </v-tab>
          </v-tabs>

          <!-- Action buttons row based on active tab -->
          <v-row id="tour-team-actions" class="mt-4">
            <!-- Tasks tab actions -->
            <v-col cols="12" md="6" lg="4" v-if="activeTab === 'tasks' && canCreateTasks">
              <v-btn
                v-tooltip:bottom="'Add new tasks to the team'"
                @click="newTaskDialog = !newTaskDialog"
                color="primary"
                class="w-100 project-card rounded-lg font-weight-bold"
                size="large"
                variant="outlined"
              >
                <v-icon start>mdi-file-document-plus-outline</v-icon>
                Add New Tasks
              </v-btn>
            </v-col>

            <!-- Announcements tab actions -->
            <v-col
              cols="12"
              md="6"
              lg="4"
              v-if="activeTab === 'announcements' && canCreateAnnouncements"
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
              <v-col cols="12" md="6" lg="4" v-if="showAddMembersButton">
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
              <v-col cols="12" md="6" lg="4" v-if="canManageMembers">
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
          <!-- Loading State for Tasks -->
          <div v-if="isLoadingTasks">
            <!-- Header skeleton -->
            <v-row>
              <v-col cols="12">
                <v-skeleton-loader type="heading" width="200px" class="mb-4"></v-skeleton-loader>
              </v-col>

              <!-- Search controls skeleton -->
              <v-col cols="12">
                <v-row>
                  <v-col cols="12" md="4">
                    <v-skeleton-loader type="text" height="40px"></v-skeleton-loader>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-skeleton-loader type="text" height="40px"></v-skeleton-loader>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-skeleton-loader type="text" height="40px"></v-skeleton-loader>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>

            <!-- Tasks skeleton grid -->
            <v-row>
              <v-col v-for="n in 6" :key="`task-skeleton-${n}`" cols="12" md="6" lg="4">
                <v-card class="mb-4 elevation-2">
                  <v-card-item>
                    <v-skeleton-loader type="list-item-two-line"></v-skeleton-loader>
                    <div class="d-flex gap-2 mt-2">
                      <v-skeleton-loader type="chip" width="60px"></v-skeleton-loader>
                      <v-skeleton-loader type="chip" width="80px"></v-skeleton-loader>
                    </div>
                  </v-card-item>
                  <v-card-text>
                    <v-skeleton-loader type="paragraph" max-width="100%"></v-skeleton-loader>
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

          <!-- Actual Tasks Content -->
          <div id="tour-tasks-content" v-else>
            <!-- Tasks Header and Controls -->
            <v-row v-if="userLoaded">
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between mb-4">
                  <h2 class="text-h5">Your Tasks ({{ filteredAndSortedTasks.length }})</h2>
                </div>
              </v-col>

              <!-- Search and Filter Controls -->
              <v-col cols="12">
                <v-row id="tour-task-search">
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="taskSearchQuery"
                      label="Search by task name"
                      placeholder="e.g., Project Report"
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      clearable
                      hide-details
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="taskTagSearchQuery"
                      label="Search by tags"
                      placeholder="e.g., urgent development"
                      prepend-inner-icon="mdi-tag-multiple"
                      variant="outlined"
                      density="compact"
                      clearable
                      hide-details
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="taskFilterType"
                      :items="taskFilterOptions"
                      label="Filter tasks"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-select>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>

            <!-- Tasks Grid -->
            <v-row v-if="paginatedTasks.length > 0 && userLoaded">
              <v-col v-for="task in paginatedTasks" :key="task._id" cols="12" md="6" lg="4">
                <v-card class="mb-4 elevation-2 project-card" @click="submitTask(task._id)">
                  <v-card-item>
                    <v-card-title>{{ task.title }}</v-card-title>
                    <v-card-subtitle>
                      <v-chip :color="getPriorityColor(task.priority)" class="mr-2">
                        {{ task.priority }}
                      </v-chip>
                      <v-chip color="purple-darken-2">
                        {{ task.category }}
                      </v-chip>
                      <v-chip-group>
                        <v-chip
                          v-for="tag in task.tags"
                          :key="tag"
                          color="black"
                          size="small"
                          class="ml-1"
                        >
                          {{ tag }}
                        </v-chip>
                      </v-chip-group>
                    </v-card-subtitle>
                  </v-card-item>
                  <v-card-text>
                    <p>{{ task.description }}</p>
                    <div class="text-caption">
                      <span>Weight: {{ task.weighted }}</span>
                    </div>
                    <div class="d-flex justify-space-between text-caption">
                      <span>Start: {{ new Date(task.startDate).toLocaleDateString() }}</span>
                      <span>Due: {{ new Date(task.dueDate).toLocaleDateString() }}</span>
                    </div>
                  </v-card-text>
                  <v-card-actions v-if="!task.submitted">
                    <v-chip color="red" text-color="white">No Submission</v-chip>
                  </v-card-actions>
                  <v-card-actions v-else>
                    <v-chip color="green" text-color="white">Submitted</v-chip>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>

            <!-- Pagination -->
            <v-row v-if="totalTaskPages > 1 && userLoaded">
              <v-col cols="12" class="d-flex justify-center">
                <v-pagination
                  v-model="taskCurrentPage"
                  :length="totalTaskPages"
                  :total-visible="7"
                  color="primary"
                ></v-pagination>
              </v-col>
            </v-row>

            <!-- No Tasks State -->
            <v-row
              v-else-if="userLoaded && filteredAndSortedTasks.length === 0 && tasks.length > 0"
            >
              <v-col cols="12">
                <v-alert type="info" class="text-center">
                  No tasks match your current search and filter criteria.
                </v-alert>
              </v-col>
            </v-row>

            <!-- Empty State -->
            <v-row v-else-if="userLoaded && tasks.length === 0">
              <v-col cols="12">
                <v-alert type="info" class="text-center"> No tasks found. </v-alert>
              </v-col>
            </v-row>
          </div>
        </v-window-item>

        <!-- Workflow Tab -->
        <v-window-item value="workflow">
            <v-row>
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h2 class="text-h5 mb-4">Team's Workflow</h2>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    @click="getTaskGroups"
                    :loading="refreshingTaskGroups"
                  >
                    <v-icon start>mdi-refresh</v-icon>
                    Refresh
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          <WorkflowView
            v-model:taskGroups="taskGroups"
          />
        </v-window-item>

        <!-- Manage Tab -->
        <v-window-item value="task-groups" v-if="canManageTaskGroups">
          <!-- Loading State for Task Groups -->
          <div v-if="refreshingTaskGroups">
            <v-row>
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between mb-3">
                  <v-skeleton-loader type="heading" width="300px"></v-skeleton-loader>
                  <v-skeleton-loader type="button" width="100px" height="32px"></v-skeleton-loader>
                </div>
              </v-col>
            </v-row>

            <!-- Overview skeleton -->
            <v-row>
              <v-col cols="12">
                <v-card class="mb-4" variant="outlined">
                  <v-card-title class="d-flex align-center">
                    <v-skeleton-loader type="text" width="200px"></v-skeleton-loader>
                  </v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="6" md="3" v-for="n in 4" :key="`overview-skeleton-${n}`">
                        <v-card class="text-center pa-3" variant="tonal">
                          <v-card-title>
                            <v-skeleton-loader
                              type="text"
                              width="40px"
                              class="mx-auto"
                            ></v-skeleton-loader>
                          </v-card-title>
                          <v-card-subtitle>
                            <v-skeleton-loader
                              type="text"
                              width="80px"
                              class="mx-auto"
                            ></v-skeleton-loader>
                          </v-card-subtitle>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Task groups skeleton -->
            <v-row>
              <v-col cols="12">
                <v-skeleton-loader type="heading" width="150px" class="mb-3"></v-skeleton-loader>
              </v-col>
              <v-col v-for="n in 6" :key="`taskgroup-skeleton-${n}`" cols="12" md="6" lg="4">
                <v-card class="mb-4 elevation-2" variant="outlined">
                  <v-card-item>
                    <v-card-title class="d-flex align-center">
                      <v-skeleton-loader type="text" width="200px"></v-skeleton-loader>
                      <v-spacer></v-spacer>
                      <v-skeleton-loader type="chip" width="60px"></v-skeleton-loader>
                    </v-card-title>
                    <v-skeleton-loader type="text" width="150px" class="mb-1"></v-skeleton-loader>
                    <v-skeleton-loader type="text" width="120px"></v-skeleton-loader>
                  </v-card-item>

                  <v-card-text>
                    <!-- Progress skeleton -->
                    <div class="mb-3">
                      <div class="d-flex justify-space-between mb-1">
                        <v-skeleton-loader
                          type="text"
                          width="60px"
                          height="12px"
                        ></v-skeleton-loader>
                        <v-skeleton-loader
                          type="text"
                          width="30px"
                          height="12px"
                        ></v-skeleton-loader>
                      </div>
                      <v-skeleton-loader
                        type="divider"
                        height="8px"
                        class="rounded"
                      ></v-skeleton-loader>
                    </div>

                    <!-- Statistics skeleton -->
                    <v-row class="text-center">
                      <v-col cols="6">
                        <v-skeleton-loader
                          type="text"
                          width="30px"
                          class="mx-auto mb-1"
                        ></v-skeleton-loader>
                        <v-skeleton-loader
                          type="text"
                          width="60px"
                          class="mx-auto"
                          height="12px"
                        ></v-skeleton-loader>
                      </v-col>
                      <v-col cols="6">
                        <v-skeleton-loader
                          type="text"
                          width="30px"
                          class="mx-auto mb-1"
                        ></v-skeleton-loader>
                        <v-skeleton-loader
                          type="text"
                          width="60px"
                          class="mx-auto"
                          height="12px"
                        ></v-skeleton-loader>
                      </v-col>
                    </v-row>
                  </v-card-text>

                  <v-card-actions>
                    <v-skeleton-loader type="button" width="80px"></v-skeleton-loader>
                    <v-spacer></v-spacer>
                    <v-skeleton-loader type="chip" width="80px"></v-skeleton-loader>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Actual Task Groups Content -->
          <div v-else>
            <v-row>
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h2 class="text-h5 mb-4">Manage Team - Task Groups</h2>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    @click="getTaskGroups"
                    :loading="refreshingTaskGroups"
                  >
                    <v-icon start>mdi-refresh</v-icon>
                    Refresh
                  </v-btn>
                </div>
              </v-col>
            </v-row>

            <!-- Task Groups Overview -->
            <v-row v-if="taskGroups.length > 0">
              <v-col cols="12">
                <v-card class="mb-4" variant="outlined">
                  <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2">mdi-view-dashboard</v-icon>
                    Task Groups Overview
                  </v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="6" md="3">
                        <v-card class="text-center pa-3" color="primary" variant="tonal">
                          <v-card-title class="text-h4">{{ taskGroups.length }}</v-card-title>
                          <v-card-subtitle>Total Task Groups</v-card-subtitle>
                        </v-card>
                      </v-col>
                      <v-col cols="6" md="3">
                        <v-card class="text-center pa-3" color="success" variant="tonal">
                          <v-card-title class="text-h4">{{
                            taskGroups.reduce((sum, group) => sum + group.totalTasks, 0)
                          }}</v-card-title>
                          <v-card-subtitle>Total Tasks</v-card-subtitle>
                        </v-card>
                      </v-col>
                      <v-col cols="6" md="3">
                        <v-card class="text-center pa-3" color="info" variant="tonal">
                          <v-card-title class="text-h4">{{
                            taskGroups.reduce((sum, group) => sum + group.completedTasks, 0)
                          }}</v-card-title>
                          <v-card-subtitle>Completed Tasks</v-card-subtitle>
                        </v-card>
                      </v-col>
                      <v-col cols="6" md="3">
                        <v-card class="text-center pa-3" color="warning" variant="tonal">
                          <v-card-title class="text-h4">
                            {{
                              taskGroups.length > 0
                                ? Math.round(
                                    taskGroups.reduce(
                                      (sum, group) => sum + parseFloat(group.completionRate),
                                      0,
                                    ) / taskGroups.length,
                                  )
                                : 0
                            }}%
                          </v-card-title>
                          <v-card-subtitle>Avg Completion</v-card-subtitle>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <!-- Task Groups List -->
            <v-row v-if="taskGroups.length > 0">
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h3 class="text-h6">Task Groups</h3>
                </div>
              </v-col>
              <v-col
                v-for="taskGroup in taskGroups"
                :key="taskGroup.taskGroupId"
                cols="12"
                md="6"
                lg="4"
              >
                <v-card
                  class="mb-4 elevation-2 project-card task-group-card"
                  @click="openTaskGroupDialog(taskGroup.taskGroupId)"
                  variant="outlined"
                >
                  <v-card-item>
                    <v-card-title class="d-flex align-center">
                      <v-icon class="mr-2">mdi-folder-multiple</v-icon>
                      {{ taskGroup.title }}
                      <v-spacer></v-spacer>
                      <v-chip :color="getPriorityColor(taskGroup.priority)" size="small">
                        {{ taskGroup.priority }}
                      </v-chip>
                    </v-card-title>
                    <v-card-subtitle> Category: {{ taskGroup.category }} </v-card-subtitle>
                    <v-card-subtitle class="text-caption">
                      Due: {{ formatDate(taskGroup.dueDate) }}
                    </v-card-subtitle>
                  </v-card-item>

                  <v-card-text>
                    <!-- Progress Bar -->
                    <div class="mb-3">
                      <div class="d-flex justify-space-between mb-1">
                        <span class="text-caption">Progress</span>
                        <span class="text-caption">{{ taskGroup.completionRate }}%</span>
                      </div>
                      <v-progress-linear
                        :model-value="taskGroup.completionRate"
                        color="success"
                        height="8"
                        rounded
                      ></v-progress-linear>
                    </div>

                    <!-- Task Statistics -->
                    <v-row class="text-center">
                      <v-col cols="6">
                        <div class="text-h6 font-weight-bold">{{ taskGroup.totalTasks }}</div>
                        <div class="text-caption text-grey">Total Tasks</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-h6 font-weight-bold text-success">
                          {{ taskGroup.completedTasks }}
                        </div>
                        <div class="text-caption text-grey">Completed</div>
                      </v-col>
                    </v-row>
                  </v-card-text>

                  <v-card-actions>
                    <v-btn
                      variant="outlined"
                      size="small"
                      @click.stop="openTaskGroupDialog(taskGroup.taskGroupId)"
                    >
                      <v-icon start>mdi-cog</v-icon>
                      Manage
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-chip variant="outlined" size="small" color="primary">
                      Weight: {{ taskGroup.totalWeight }}
                    </v-chip>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>

            <!-- No Task Groups State -->
            <v-row v-else>
              <v-col cols="12">
                <v-card class="text-center pa-6" variant="outlined">
                  <v-card-text>
                    <v-icon size="64" class="mb-4" color="grey">mdi-folder-open</v-icon>
                    <h3 class="text-h6 mb-2">No Task Groups Found</h3>
                    <p class="text-grey mb-4">
                      Task groups will appear here when you create tasks for team members.
                    </p>
                    <v-btn color="primary" @click="newTaskDialog = true" size="large">
                      <v-icon start>mdi-plus</v-icon>
                      Create First Task Group
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-window-item>

        <!-- Announcements Tab -->
        <v-window-item value="announcements">
          <!-- Loading State for Announcements -->
          <div v-if="isLoadingAnnouncements">
            <v-row>
              <v-col cols="12">
                <v-skeleton-loader type="heading" width="250px" class="mb-4"></v-skeleton-loader>
              </v-col>
            </v-row>

            <!-- Announcement skeletons -->
            <v-row>
              <v-col cols="12" v-for="n in 3" :key="`announcement-skeleton-${n}`">
                <v-card class="mb-4 elevation-2" variant="outlined">
                  <v-card-item>
                    <v-skeleton-loader type="list-item" class="mb-2"></v-skeleton-loader>
                    <v-skeleton-loader
                      type="heading"
                      width="300px"
                      class="mb-1"
                    ></v-skeleton-loader>
                    <v-skeleton-loader type="text" width="200px" class="mb-1"></v-skeleton-loader>
                    <v-skeleton-loader type="text" width="150px"></v-skeleton-loader>
                  </v-card-item>
                  <v-card-text>
                    <v-skeleton-loader type="paragraph" max-width="100%"></v-skeleton-loader>
                  </v-card-text>
                  <v-card-actions>
                    <v-skeleton-loader type="button" width="80px" class="mr-2"></v-skeleton-loader>
                    <v-skeleton-loader type="button" width="100px"></v-skeleton-loader>
                    <v-spacer></v-spacer>
                    <v-skeleton-loader type="button" width="60px" class="mr-2"></v-skeleton-loader>
                    <v-skeleton-loader type="button" width="70px"></v-skeleton-loader>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Actual Announcements Content -->
          <div id="tour-announcements" v-else>
            <v-row>
              <v-col cols="12">
                <h2 class="text-h5 mb-4">Team Announcements</h2>
                <v-card v-if="announcements.length == 0" class="mb-4">
                  <v-card-text>
                    <p class="text-center text-grey">No announcements yet.</p>
                  </v-card-text>
                </v-card>
                <v-card
                  v-for="announcement in announcements"
                  :key="announcement._id"
                  class="mb-4 elevation-2"
                  variant="outlined"
                >
                  <v-card-item>
                    <v-card-title>Author: {{ announcement.createdByUsername }} </v-card-title>
                    <v-card-title class="font-weight-bold">{{ announcement.title }}</v-card-title>
                    <v-card-subtitle v-if="announcement.subtitle" class="text-caption">
                      {{ announcement.subtitle }}
                    </v-card-subtitle>
                    <v-card-subtitle class="text-caption">
                      Last Updated at:{{ new Date(announcement.updatedAt).toLocaleDateString() }}
                    </v-card-subtitle>
                  </v-card-item>
                  <v-card-text>
                    <p>{{ announcement.content }}</p>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn
                      @click="toggleLikeAnnouncement(announcement._id)"
                      :color="getLikeColor(announcement)"
                      variant="outlined"
                    >
                      <v-icon start>mdi-thumb-up</v-icon>Like ({{ announcement.likeUsers.length }})
                    </v-btn>
                    <v-btn
                      @click="viewAnnouncement(announcement._id)"
                      color="secondary"
                      variant="outlined"
                    >
                      <v-icon start>mdi-comment-text</v-icon>Comments
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn
                      v-if="canEditAnnouncements"
                      color="primary"
                      variant="outlined"
                      @click="editAnnnouncement(announcement._id)"
                    >
                      Edit
                    </v-btn>
                    <v-btn
                      v-if="canEditAnnouncements"
                      color="error"
                      variant="outlined"
                      @click="deleteAnnouncement(announcement._id)"
                    >
                      Delete
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-window-item>

        <!-- Members Tab -->
        <v-window-item value="members">
          <!-- Loading State for Members -->
          <div v-if="isLoadingMembers">
            <v-row>
              <v-col cols="12">
                <v-skeleton-loader type="heading" width="200px" class="mb-4"></v-skeleton-loader>

                <!-- Search box skeleton -->
                <v-skeleton-loader type="text" height="40px" class="mb-4"></v-skeleton-loader>
              </v-col>
            </v-row>

            <!-- Members skeleton grid -->
            <v-row>
              <v-col v-for="n in 8" :key="`member-skeleton-${n}`" cols="12" md="4">
                <v-card class="mb-2" variant="outlined">
                  <v-card-item>
                    <v-skeleton-loader type="list-item" class="mb-2"></v-skeleton-loader>
                    <v-skeleton-loader type="chip" width="80px"></v-skeleton-loader>
                  </v-card-item>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Actual Members Content -->
          <div id="tour-members" v-else>
            <v-row>
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between mb-4">
                  <h2 class="text-h5">Team Members ({{ filteredMembers.length }})</h2>
                </div>

                <!-- Search Box -->
                <v-text-field
                  v-model="memberSearchQuery"
                  label="Search members..."
                  placeholder="Search by username or #role (e.g., #admin, #the-pro)"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                  class="mb-4"
                >
                  <template v-slot:append-inner>
                    <v-tooltip location="top">
                      <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" color="grey">mdi-help-circle-outline</v-icon>
                      </template>
                      <div>
                        <div><strong>Search Tips:</strong></div>
                        <div>• Type username to search by name</div>
                        <div>• Type #role to search by role</div>
                        <div>• Examples: john, #admin</div>
                      </div>
                    </v-tooltip>
                  </template>
                </v-text-field>
              </v-col>
              <v-col v-for="member in filteredMembers" :key="member.userId" cols="12" md="4">
                <v-card
                  class="mb-2"
                  variant="outlined"
                  :color="
                    member.customRole
                      ? member.customRole.color || 'purple'
                      : getRoleColor(member.role)
                  "
                >
                  <v-card-item>
                    <v-card-title>{{ member.username }}</v-card-title>
                    <v-card-subtitle>
                      <!-- Show custom role if it exists, otherwise show base role -->
                      <v-chip
                        v-if="member.customRole"
                        :color="member.customRole.color || 'purple'"
                        size="small"
                        variant="tonal"
                      >
                        <v-icon start size="small">{{
                          member.customRole.icon || 'mdi-star'
                        }}</v-icon>
                        {{ member.customRole.name }}
                      </v-chip>
                      <v-chip
                        v-else
                        :color="getRoleColor(member.role)"
                        size="small"
                        variant="tonal"
                      >
                        <v-icon start size="small">{{ getRoleIcon(member.role) }}</v-icon>
                        {{ member.role }}
                      </v-chip>
                    </v-card-subtitle>
                  </v-card-item>
                </v-card>
              </v-col>
            </v-row>

            <!-- No Results State -->
            <v-row v-if="filteredMembers.length === 0 && memberSearchQuery">
              <v-col cols="12">
                <v-card class="text-center pa-6" variant="outlined">
                  <v-card-text>
                    <v-icon size="64" class="mb-4" color="grey">mdi-account-search</v-icon>
                    <h3 class="text-h6 mb-2">No Members Found</h3>
                    <p class="text-grey mb-2">
                      No members match your search: "<strong>{{ memberSearchQuery }}</strong
                      >"
                    </p>
                    <p class="text-caption text-grey">
                      Try searching by username or use #role to search by role (e.g., #admin)
                    </p>
                    <v-btn
                      color="primary"
                      variant="outlined"
                      @click="memberSearchQuery = ''"
                      class="mt-2"
                    >
                      Clear Search
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-window-item>

        <!-- Management Tab -->
        <v-window-item value="roles" v-if="canManageMembers || isAdmin()">
          <RoleManagementTabs
            :teamId="teamId"
            :userProps="user"
            :teamMembers="teamMembers"
            @roles-updated="handleRolesUpdated"
          />
        </v-window-item>

        <!-- Delete Team Tab -->
        <v-window-item value="delete-team" v-if="isAdmin()">
          <div class="delete-team-container">
            <!-- Warning Header -->
            <v-row>
              <v-col cols="12">
                <v-alert
                  type="error"
                  variant="tonal"
                  class="mb-6"
                  border="start"
                  border-color="error"
                >
                  <template v-slot:prepend>
                    <v-icon size="large">mdi-alert-circle</v-icon>
                  </template>
                  <v-alert-title class="text-h5 mb-2">
                    <v-icon class="mr-2">mdi-delete</v-icon>
                    Delete Team - Permanent Action
                  </v-alert-title>
                  <div class="text-body-1">
                    <p class="mb-2">
                      <strong>Warning:</strong> This action will permanently delete the current team
                      and all its sub-teams.
                    </p>
                    <p class="mb-0">
                      All associated data including tasks, announcements, and member associations
                      will be lost forever.
                    </p>
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <!-- Team Hierarchy Preview -->
            <v-row>
              <v-col cols="12">
                <v-card variant="outlined" class="mb-4">
                  <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2" color="error">mdi-family-tree</v-icon>
                    Teams to be Deleted
                    <v-spacer></v-spacer>
                    <v-btn
                      @click="fetchSubTeams"
                      variant="outlined"
                      size="small"
                      :loading="isLoadingSubTeams"
                    >
                      <v-icon start>mdi-refresh</v-icon>
                      Refresh
                    </v-btn>
                  </v-card-title>

                  <v-card-text>
                    <!-- Loading State -->
                    <div v-if="isLoadingSubTeams" class="py-4">
                      <v-skeleton-loader
                        type="list-item-three-line"
                        class="mb-2"
                      ></v-skeleton-loader>
                      <v-skeleton-loader
                        type="list-item-two-line"
                        class="ml-4 mb-2"
                      ></v-skeleton-loader>
                      <v-skeleton-loader type="list-item-two-line" class="ml-8"></v-skeleton-loader>
                    </div>

                    <!-- Hierarchy Tree -->
                    <div v-else>
                      <!-- Current Team (Root) -->
                      <div class="team-hierarchy-item root-team">
                        <div class="d-flex align-center mb-2">
                          <v-icon color="error" class="mr-2">mdi-crown</v-icon>
                          <div class="flex-grow-1">
                            <div class="text-h6 font-weight-bold">{{ team.title }}</div>
                            <div class="text-body-2 text-grey">
                              Current Team • {{ team.category }}
                            </div>
                            <div class="text-caption text-grey">
                              {{ teamMembers.length }} members • {{ tasks.length }} tasks
                            </div>
                          </div>
                          <v-chip color="error" variant="tonal" size="small">
                            <v-icon start size="small">mdi-delete</v-icon>
                            WILL BE DELETED
                          </v-chip>
                        </div>
                      </div>

                      <!-- Sub Teams -->
                      <div v-if="subTeams.length > 0" class="mt-4">
                        <div class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                          <v-icon class="mr-2">mdi-sitemap</v-icon>
                          Sub-teams ({{ subTeams.length }})
                        </div>

                        <div
                          v-for="(subTeam, index) in subTeams"
                          :key="subTeam._id"
                          class="sub-team-item"
                          :class="{ 'last-sub-team': index === subTeams.length - 1 }"
                        >
                          <div class="d-flex align-center mb-2">
                            <!-- Hierarchy Lines -->
                            <div class="hierarchy-lines">
                              <div class="vertical-line" v-if="index < subTeams.length"></div>
                              <div class="horizontal-line"></div>
                            </div>

                            <v-icon color="warning" class="mr-2">mdi-source-branch</v-icon>
                            <div class="flex-grow-1">
                              <div class="text-body-1 font-weight-bold">{{ subTeam.title }}</div>
                              <div class="text-body-2 text-grey">
                                Sub-team • {{ subTeam.category }}
                              </div>
                              <div class="text-caption text-grey">
                                Created: {{ formatDate(subTeam.createdAt) }}
                              </div>
                            </div>
                            <v-chip color="warning" variant="tonal" size="small">
                              <v-icon start size="small">mdi-delete</v-icon>
                              WILL BE DELETED
                            </v-chip>
                          </div>
                        </div>
                      </div>

                      <!-- No Sub Teams -->
                      <div v-else class="mt-4">
                        <v-alert type="info" variant="tonal" class="mb-0">
                          This team has no sub-teams. Only the current team will be deleted.
                        </v-alert>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Confirmation Section -->
            <v-row>
              <v-col cols="12">
                <v-card variant="outlined" class="mb-4">
                  <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2" color="error">mdi-shield-alert</v-icon>
                    Confirmation Required
                  </v-card-title>
                  <v-card-text>
                    <div class="mb-4">
                      <p class="text-body-1 mb-3">
                        To proceed with deletion, please confirm by typing the team name exactly as
                        shown:
                      </p>
                      <v-chip color="primary" variant="tonal" class="mb-3">
                        {{ team.title }}
                      </v-chip>
                    </div>

                    <v-text-field
                      v-model="deleteConfirmationText"
                      label="Type team name to confirm deletion"
                      variant="outlined"
                      :placeholder="team.title"
                      :error="deleteConfirmationText && deleteConfirmationText !== team.title"
                      :error-messages="
                        deleteConfirmationText && deleteConfirmationText !== team.title
                          ? 'Team name does not match'
                          : ''
                      "
                      class="mb-4"
                    >
                      <template v-slot:prepend-inner>
                        <v-icon color="error">mdi-keyboard</v-icon>
                      </template>
                    </v-text-field>

                    <v-checkbox v-model="deleteConfirmationChecked" color="error" class="mb-4">
                      <template v-slot:label>
                        <span class="text-body-2">
                          I understand that this action is
                          <strong>permanent and irreversible</strong>. All data will be lost
                          forever.
                        </span>
                      </template>
                    </v-checkbox>
                  </v-card-text>

                  <v-card-actions class="px-4 pb-4">
                    <v-btn @click="goBackToTeams" variant="outlined" size="large">
                      <v-icon start>mdi-arrow-left</v-icon>
                      Cancel
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn
                      @click="confirmDeleteTeam"
                      color="error"
                      variant="elevated"
                      size="large"
                      :disabled="!canDeleteTeam"
                      :loading="isDeletingTeam"
                    >
                      <v-icon start>mdi-delete-forever</v-icon>
                      Delete Team Permanently
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-window-item>
      </v-window>
    </div>
  </v-container>
</template>

<style scoped>
.project-card {
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  min-height: 60px;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
}

.task-group-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.task-group-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(var(--v-theme-primary), 0.3);
}

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

/* Delete Team Tab Styles */
.delete-team-container {
  max-width: 1200px;
  margin: 0 auto;
}

.team-hierarchy-item {
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-error), 0.05);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
}

.root-team {
  border: 2px solid rgba(var(--v-theme-error), 0.4);
  background: rgba(var(--v-theme-error), 0.08);
}

.sub-team-item {
  position: relative;
  margin-left: 24px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-warning), 0.05);
  border: 1px solid rgba(var(--v-theme-warning), 0.2);
}

.sub-team-item.last-sub-team {
  margin-bottom: 0; /* Remove bottom margin from last item */
}

.sub-team-item.last-sub-team .hierarchy-lines {
  overflow: visible;
}

.hierarchy-lines {
  position: absolute;
  left: -24px;
  top: 0;
  width: 24px;
  height: 100%;
  display: flex;
  align-items: center;
  /* overflow: hidden; */
}

.vertical-line {
  position: absolute;
  left: 12px;
  top: -8%;
  height: calc(100% + 12px); /* Extend to connect with next item */
  width: 2px;
  background: rgba(var(--v-theme-primary), 0.3);
}

/* Special styling for the last sub-team's vertical line */
.sub-team-item.last-sub-team .vertical-line {
  height: 32px; /* Only extend to the horizontal line, don't go beyond */
  top: -8px; /* Start from the top of the container */
}

.horizontal-line {
  position: absolute;
  left: 12px;
  top: 24px;
  width: 12px;
  height: 2px;
  background: rgba(var(--v-theme-primary), 0.3);
}

.horizontal-line::before {
  content: '';
  position: absolute;
  right: -3px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.6);
}
</style>
