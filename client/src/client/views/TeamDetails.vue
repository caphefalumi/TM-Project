<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import NewTasks from '../components/NewTasks.vue'
import NewAnnouncements from '../components/NewAnnouncements.vue'
import TaskSubmission from '../components/TaskSubmission.vue'
import DeleteMembers from '../components/DeleteMembers.vue'
import UpdateAnnouncements from '../components/UpdateAnnouncements.vue'
import DeleteAnnouncements from '../components/DeleteAnnouncements.vue'
import AnnouncementView from '../components/AnnouncementView.vue'
import UpdateTaskGroups from '../components/UpdateTaskGroups.vue'
import RoleManagement from '../components/RoleManagement.vue'

const { getUserByAccessToken } = AuthStore

const route = useRoute()
const router = useRouter()

const isAdmin = ref(false)
const isModerator = ref(false)
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
const newTaskDialog = ref(false)

const viewAnnouncementDialog = ref(false)
const deleteAnnouncementDialog = ref(false)
const updateAnnouncementDialog = ref(false)
const newAnnouncementsDialog = ref(false)
const taskSubmissionDialog = ref(false)
const deleteMembersDialog = ref(false)
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
const taskGroups = ref([])
const refreshingTaskGroups = ref(false)

// Tasks filtering and pagination
const taskSearchQuery = ref('')
const taskTagSearchQuery = ref('')
const taskFilterType = ref('all') // 'all', 'not-submitted', 'pending'
const taskCurrentPage = ref(1)
const taskItemsPerPage = 6

const activeTab = ref('tasks')

// Get team ID from route params
const teamId = ref(route.params.teamId)

// Computed properties for permissions
const canCreateTasks = computed(() => {
  return userPermissions.value.canCreateTaskGroups || userPermissions.value.isGlobalAdmin
})

const canCreateAnnouncements = computed(() => {
  return userPermissions.value.canEditAnnouncements || userPermissions.value.isGlobalAdmin
})

const canManageMembers = computed(() => {
  return userPermissions.value.canAddMembers || userPermissions.value.isGlobalAdmin
})

const canManageTaskGroups = computed(() => {
  return userPermissions.value.canViewTaskGroups || userPermissions.value.isGlobalAdmin
})

const canEditAnnouncements = computed(() => {
  return userPermissions.value.canEditAnnouncements || userPermissions.value.isGlobalAdmin
})

const canManageRoles = computed(() => {
  return userPermissions.value.canChangeRoles || userPermissions.value.isGlobalAdmin
})

// Function to initialize/reload team data
const initializeTeamData = async () => {
  const userFromToken = await getUserByAccessToken()
  if (userFromToken) {
    setUserToUserToken(userFromToken)
    await fetchTeamTasks()
    await fetchTeamDetails()
    await fetchAnnouncements()
    await fetchTeamMembers()
    await getTaskGroups()
    await fetchUserPermissions()

    // Update role-based flags
    updateRoleFlags()

    // Check if user is a member of the team, do not check for admin
    if (
      teamMembers.value.some((member) => member.userId === user.value.userId) ||
      user.value.username === 'admin'
    ) {
      console.log('User is a member of the team:', teamId.value)
    } else {
      console.error('User is not a member of the team:', teamId.value)
      // Redirect to home if not a member
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
      isAdmin.value = false
      isModerator.value = false
      userPermissions.value = {}
      initializeTeamData()
    }
  },
  { immediate: false },
)

onMounted(async () => {
  await initializeTeamData()
})

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const getRoleColor = (role) => {
  switch (role) {
    case 'Admin': return 'red'
    case 'Moderator': return 'orange'
    case 'Member': return 'primary'
    default: return 'grey'
  }
}

const fetchUserPermissions = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${teamId.value}/members/${user.value.userId}/permissions`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.ok) {
      userPermissions.value = await response.json()
      console.log('User permissions:', userPermissions.value)
    } else {
      console.error('Failed to fetch user permissions')
      userPermissions.value = {}
    }
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    userPermissions.value = {}
  }
}

const updateRoleFlags = () => {
  const userRole = userPermissions.value.role || 'Member'
  isAdmin.value = userRole === 'Admin' || user.value.username === 'admin'
  isModerator.value = userRole === 'Moderator'
  console.log('Role flags updated:', { isAdmin: isAdmin.value, isModerator: isModerator.value, role: userRole })
}

const fetchTeamTasks = async () => {
  try {
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
  }
}

const fetchTeamDetails = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId.value}`, {
      method: 'GET',
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
  }
}

const fetchAnnouncements = async () => {
  try {
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
  }
}

const fetchTeamMembers = async () => {
  try {
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
  }
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

const taskFilterOptions = [
  { title: 'All Tasks', value: 'all' },
  { title: 'Not Submitted', value: 'not-submitted' },
  { title: 'Pending Tasks', value: 'pending' },
]
</script>

<template>
  <v-container fluid v-if="userLoaded">
    <!-- Header with back button -->
    <v-row class="align-center">
      <v-col cols="auto">
        <v-btn icon @click="goBackToTeams" variant="text">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h4 font-weight-bold">{{ team.title }}</h1>
        <p class="text-grey">{{ team.description }}</p>
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
      @roles-updated="fetchTeamMembers"
    />

    <!-- Team navigation tabs -->
    <v-row class="align-center">
      <v-col cols="12" lg="8" xl="9">
        <v-tabs v-model="activeTab">
          <v-tab value="tasks">Tasks</v-tab>
          <v-tab value="announcements">Announcements</v-tab>
          <v-tab value="members">Members</v-tab>
          <v-tab value="manage" v-if="canManageTaskGroups">Manage</v-tab>
        </v-tabs>
      </v-col>
    </v-row>
    <v-row class="align-center mb-6">
      <v-col cols="12" lg="4" xl="3">
        <v-btn
          v-if="canCreateTasks"
          v-tooltip:bottom="'Add new tasks to the team'"
          @click="newTaskDialog = !newTaskDialog"
          color="primary"
          class="w-100 project-card rounded-lg font-weight-bold text-h5"
          size="large"
          flat
        >
          <v-icon start>mdi-file-document-plus-outline</v-icon>
          Add new tasks
        </v-btn>
      </v-col>
      <v-col cols="12" lg="4" xl="3">
        <v-btn
          v-if="canCreateAnnouncements"
          v-tooltip:bottom="'Add new announcement'"
          @click="newAnnouncementsDialog = !newAnnouncementsDialog"
          color="success"
          class="w-100 project-card rounded-lg font-weight-bold text-h5"
          size="large"
          flat
        >
          <v-icon start>mdi-bullhorn</v-icon>
          Add new annoucement
        </v-btn>
      </v-col>
      <v-col cols="12" lg="4" xl="3">
        <v-btn
          v-if="canManageMembers"
          v-tooltip:bottom="'Remove team members'"
          @click="deleteMembersDialog = true"
          color="red-lighten-2"
          class="w-100 project-card rounded-lg font-weight-bold text-h5"
          size="large"
          flat
        >
          <v-icon start>mdi-account-remove</v-icon>
          Remove Members
        </v-btn>
      </v-col>
      <v-col cols="12" lg="4" xl="3">
        <v-btn
          v-if="canManageRoles"
          v-tooltip:bottom="'Manage member roles and permissions'"
          @click="roleManagementDialog = true"
          color="purple"
          class="w-100 project-card rounded-lg font-weight-bold text-h5"
          size="large"
          flat
        >
          <v-icon start>mdi-account-cog</v-icon>
          Manage Roles
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tab content -->
    <v-window v-model="activeTab">
      <!-- Tasks Tab -->
      <v-window-item value="tasks">
        <!-- Tasks Header and Controls -->
        <v-row v-if="userLoaded">
          <v-col cols="12">
            <div class="d-flex align-center justify-space-between mb-4">
              <h2 class="text-h5">Your Tasks ({{ filteredAndSortedTasks.length }})</h2>
            </div>
          </v-col>

          <!-- Search and Filter Controls -->
          <v-col cols="12">
            <v-row>
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
        <v-row v-else-if="userLoaded && filteredAndSortedTasks.length === 0 && tasks.length > 0">
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
      </v-window-item>

      <!-- Announcements Tab -->
      <v-window-item value="announcements">
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
      </v-window-item>

      <!-- Members Tab -->
      <v-window-item value="members">
        <v-row>
          <v-col cols="12">
            <h2 class="text-h5 mb-4">Team Members ({{ teamMembers.length }})</h2>
          </v-col>
          <v-col v-for="member in teamMembers" :key="member.userId" cols="12" md="4">
            <v-card class="mb-2" variant="outlined" :color="getRoleColor(member.role)">
              <v-card-item>
                <v-card-title>{{ member.username }}</v-card-title>
                <v-card-subtitle>{{ member.role }}</v-card-subtitle>
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>      <!-- Manage Tab -->
      <v-window-item value="manage" v-if="canManageTaskGroups">
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
      </v-window-item>
    </v-window>
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
</style>
