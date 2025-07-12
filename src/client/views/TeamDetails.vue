<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import NewTasks from '../components/NewTasks.vue'
import NewAnnouncements from '../components/NewAnnouncements.vue'
import TaskSubmission from '../components/TaskSubmission.vue'
import DeleteMembers from '../components/DeleteMembers.vue'
import UpdateAnnouncements from '../components/UpdateAnnouncements.vue'
import DeleteAnnouncements from '../components/DeleteAnnouncements.vue'
import AnnouncementView from '../components/AnnouncementView.vue'

const { getUserByAccessToken } = AuthStore
const route = useRoute()
const router = useRouter()

const isAdmin = ref(false)

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

const selectedTaskForSubmission = ref(null)
const selectedAnnouncementForDeletion = ref(null)
const announcementToEdit = ref(null)
const announcementToView = ref(null)

const tasks = ref([])
const announcements = ref([])
const teamMembers = ref([])

const activeTab = ref('tasks')

// Get team ID from route params
const teamId = route.params.teamId

onMounted(async () => {
  const userFromToken = await getUserByAccessToken()
  if (userFromToken) {
    setUserToUserToken(userFromToken)
    await fetchTeamTasks()
    await fetchAnnouncements()
    await fetchTeamMembers()
    if (
      teamMembers.value.some(
        (member) => member.userId === user.value.userId && member.role === 'Admin',
      )
    ) {
      isAdmin.value = true
    }
    userLoaded.value = true
  } else {
    router.push('/')
  }
})

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const getRoleColor = (role) => {
  return role === 'Admin' ? 'red' : 'primary'
}

const fetchTeamTasks = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      // '/api/teams/:teamId/:userId/tasks'
      `http://localhost:${PORT}/api/teams/${teamId}/${user.value.userId}/tasks`,
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

const fetchAnnouncements = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/teams/${teamId}/announcements`, {
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
    const response = await fetch(`http://localhost:${PORT}/api/teams/${teamId}/members`, {
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
    const response = await fetch(
      `http://localhost:${PORT}/api/announcements/${announcementId}/like`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.value.userId }),
      },
    )

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

    // Optionally, you can refetch the announcements to update the like count
    // await fetchAnnouncements()
  } catch (error) {
    console.error('Error liking announcement:', error)
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
</script>

<template>
  <v-container fluid>
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
      @task-submitted="fetchTeamTasks"
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

    <!-- Team navigation tabs -->
    <v-row class="align-center">
      <v-col cols="12" lg="8" xl="9">
        <v-tabs v-model="activeTab">
          <v-tab value="tasks">Tasks</v-tab>
          <v-tab value="announcements">Announcements</v-tab>
          <v-tab value="members">Members</v-tab>
        </v-tabs>
      </v-col>
    </v-row>
    <v-row class="align-center mb-6">
      <v-col cols="12" lg="4" xl="3">
        <v-btn
          v-if="isAdmin"
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
          v-if="isAdmin"
          v-tooltip:bottom="'Add new announcement'"
          @click="newAnnouncementsDialog = !newAnnouncementsDialog"
          color="secondary"
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
          v-if="isAdmin"
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
    </v-row>

    <!-- Tab content -->
    <v-window v-model="activeTab">
      <!-- Tasks Tab -->
      <v-window-item value="tasks">
        <v-row v-if="tasks.length > 0 && userLoaded">
          <v-col cols="12">
            <h2 class="text-h5 mb-4">Your Tasks</h2>
          </v-col>
          <transition-group name="scroll-x" tag="div" class="w-100 d-flex flex-wrap" appear>
            <v-col
              v-for="(task, index) in tasks"
              :key="task._id"
              cols="12"
              md="6"
              lg="4"
              :style="{ 'transition-delay': `${index * 100}ms` }"
            >
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
                  </v-card-subtitle>
                </v-card-item>
                <v-card-text>
                  <p>{{ task.description }}</p>
                  <div class="d-flex justify-space-between text-caption">
                    <span>Weight: {{ task.weighted }}</span>
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
          </transition-group>
        </v-row>
        <v-row v-else-if="userLoaded">
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
                <v-card-title>Author: {{ announcement.createdBy }} </v-card-title>
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
                  v-if="isAdmin"
                  color="primary"
                  variant="outlined"
                  @click="editAnnnouncement(announcement._id)"
                >
                  Edit
                </v-btn>
                <v-btn
                  v-if="isAdmin"
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
