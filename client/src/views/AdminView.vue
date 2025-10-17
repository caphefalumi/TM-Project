<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import UpdateAnnouncements from '../components/UpdateAnnouncements.vue'

const authStore = useAuthStore()
const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const isAdmin = ref(false)

// Loading states
const loading = ref(true)
const deleting = ref(false)

// Tab management
const currentTab = ref('teams')

// Pagination
const teamsPage = ref(1)
const usersPage = ref(1)
const announcementsPage = ref(1)
const itemsPerPage = ref(10)

// Data storage
const teams = ref([])
const users = ref([])
const announcements = ref([])

// Dialog states
const editAnnouncementDialog = ref(false)
const selectedAnnouncement = ref({})
const notifyDialog = ref(false)
const selectedUser = ref({})
const notificationMessage = ref('')

// Computed paginated data
const paginatedTeams = computed(() => {
  const start = (teamsPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return teams.value.slice(start, end)
})

const paginatedUsers = computed(() => {
  const start = (usersPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return users.value.slice(start, end)
})

const paginatedAnnouncements = computed(() => {
  const start = (announcementsPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return announcements.value.slice(start, end)
})

// Computed pagination counts
const teamsPageCount = computed(() => Math.ceil(teams.value.length / itemsPerPage.value))
const usersPageCount = computed(() => Math.ceil(users.value.length / itemsPerPage.value))
const announcementsPageCount = computed(() =>
  Math.ceil(announcements.value.length / itemsPerPage.value),
)

onMounted(async () => {
  // Get user data from auth store
  const userData = await authStore.getUserByAccessToken()
  if (!userData || userData.username !== 'admin') {
    router.push('/home')
    return
  }

  user.value = userData
  isAdmin.value = true

  await loadAllData()
})

const loadAllData = async () => {
  loading.value = true
  try {
    await Promise.all([loadTeams(), loadUsers(), loadAnnouncements()])
  } catch (error) {
    console.log('Error loading admin data:', error)
  } finally {
    loading.value = false
  }
}

const loadTeams = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/admin/teams`, {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Loaded teams:', data.teams)
      teams.value = data.teams || []
    }
  } catch (error) {
    console.log('Error loading teams:', error)
  }
}

const loadUsers = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/admin/users`, {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      users.value = data.users || []
    } else {
      const error = await response.json()
      console.log('Failed to load users:', error.message)
      alert(`Failed to load users: ${error.message}`)
    }
  } catch (error) {
    console.log('Error loading users:', error)
  }
}

const loadAnnouncements = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/admin/announcements`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache', // Ensure fresh data
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Loaded announcements from admin API:', data.announcements)
      console.log('Sample announcement with subtitle:', data.announcements?.[0])
      // Sort announcements by date (newest first)
      announcements.value = (data.announcements || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )
    }
  } catch (error) {
    console.log('Error loading announcements:', error)
  }
}

// Team actions
const editTeam = (team) => {
  router.push(`/teams/${team._id}`)
}

const deleteTeam = async (team) => {
  if (
    !confirm(
      `Are you sure you want to delete team "${team.name}"? This will delete all associated data including tasks, announcements, and memberships.`,
    )
  ) {
    return
  }

  deleting.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/admin/teams/${team._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (response.ok) {
      await loadTeams() // Reload teams data
    } else {
      const error = await response.json()
      alert(`Failed to delete team: ${error.message}`)
    }
  } catch (error) {
    console.log('Error deleting team:', error)
    alert('Failed to delete team')
  } finally {
    deleting.value = false
  }
}

// User actions
const notifyUser = (user) => {
  selectedUser.value = user
  notificationMessage.value = ''
  notifyDialog.value = true
}

const sendNotification = async () => {
  if (!notificationMessage.value.trim()) return
  console.log('Sending notification to user:', selectedUser.value)
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/admin/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId: selectedUser.value._id,
        message: notificationMessage.value,
        type: 'admin',
      }),
    })

    if (response.ok) {
      notifyDialog.value = false
      notificationMessage.value = ''
    } else {
      const error = await response.json()
      alert(`Failed to send notification: ${error.message}`)
    }
  } catch (error) {
    console.log('Error sending notification:', error)
    alert('Failed to send notification')
  }
}

const deleteUser = async (userToDelete) => {
  if (
    !confirm(
      `Are you sure you want to delete user "${userToDelete.username}"? This will delete all their data including tasks, submissions, and comments.`,
    )
  ) {
    return
  }
  console.log('Deleting user:', userToDelete)
  deleting.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/admin/users/${userToDelete._id}`, // Never change this endpoint
      {
        method: 'DELETE',
        credentials: 'include',
      },
    )

    if (response.ok) {
      console.log('User deleted successfully:', userToDelete.username)
      await loadUsers() // Reload users data
    } else {
      const error = await response.json()
      alert(`Failed to delete user: ${error.message}`)
    }
  } catch (error) {
    console.log('Error deleting user:', error)
    alert('Failed to delete user')
  } finally {
    deleting.value = false
  }
}

// Announcement actions
const editAnnouncement = (announcement) => {
  selectedAnnouncement.value = announcement
  editAnnouncementDialog.value = true
}

const deleteAnnouncement = async (announcement) => {
  if (!confirm(`Are you sure you want to delete announcement "${announcement.title}"?`)) {
    return
  }

  deleting.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/admin/announcements/${announcement._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (response.ok) {
      await loadAnnouncements() // Reload announcements data
    } else {
      const error = await response.json()
      alert(`Failed to delete announcement: ${error.message}`)
    }
  } catch (error) {
    console.log('Error deleting announcement:', error)
    alert('Failed to delete announcement')
  } finally {
    deleting.value = false
  }
}

const onAnnouncementUpdated = async () => {
  // Add a small delay to show success message before closing dialog
  setTimeout(async () => {
    editAnnouncementDialog.value = false
    // Force reload announcements to ensure we get the latest data
    await loadAnnouncements()
  }, 1250)
}

const getBreadcrumbs = (team) => {
  // Use the API-provided fullBreadcrumbs if available
  if (team.fullBreadcrumbs && team.fullBreadcrumbs.trim()) {
    // Remove trailing " > " if it exists and add the team name
    const breadcrumbs = team.fullBreadcrumbs.replace(/\s*>\s*$/, '')
    return breadcrumbs + ' > ' + team.name
  }
  return team.name
}
</script>

<template>
  <div class="admin-view">
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">
            <v-icon class="mr-2">mdi-shield-crown</v-icon>
            Admin Panel
          </h1>

          <!-- Loading overlay -->
          <v-overlay v-model="loading" class="align-center justify-center">
            <v-progress-circular indeterminate size="64"></v-progress-circular>
          </v-overlay>

          <!-- Tabs -->
          <v-tabs v-model="currentTab" class="mb-4">
            <v-tab value="teams">
              <v-icon class="mr-2">mdi-briefcase-variant</v-icon>
              Teams ({{ teams.length }})
            </v-tab>
            <v-tab value="users">
              <v-icon class="mr-2">mdi-account-group</v-icon>
              Users ({{ users.length }})
            </v-tab>
            <v-tab value="announcements">
              <v-icon class="mr-2">mdi-bullhorn</v-icon>
              Announcements ({{ announcements.length }})
            </v-tab>
          </v-tabs>

          <!-- Tab content -->
          <v-window v-model="currentTab">
            <!-- Teams Tab -->
            <v-window-item value="teams">
              <v-card>
                <v-card-title>Team Management</v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="[
                      { title: 'Team Name', key: 'name', width: '25%' },
                      { title: 'Breadcrumbs', key: 'breadcrumbs', width: '35%' },
                      { title: 'Members', key: 'memberCount', width: '10%' },
                      { title: 'Tasks', key: 'taskCount', width: '10%' },
                      { title: 'Actions', key: 'actions', sortable: false, width: '20%' },
                    ]"
                    :items="paginatedTeams"
                    :loading="loading"
                    item-value="_id"
                    hide-default-footer
                  >
                    <template #item.breadcrumbs="{ item }">
                      <span class="text-caption">{{ getBreadcrumbs(item) }}</span>
                    </template>

                    <template #item.memberCount="{ item }">
                      <v-chip color="primary" size="small">{{ item.memberCount || 0 }}</v-chip>
                    </template>

                    <template #item.taskCount="{ item }">
                      <v-chip color="success" size="small">{{ item.taskCount || 0 }}</v-chip>
                    </template>

                    <template #item.actions="{ item }">
                      <v-btn
                        icon="mdi-pencil"
                        size="small"
                        color="primary"
                        @click="editTeam(item)"
                        class="mr-2"
                      ></v-btn>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        color="error"
                        @click="deleteTeam(item)"
                        :loading="deleting"
                      ></v-btn>
                    </template>
                  </v-data-table>

                  <!-- Teams Pagination -->
                  <div class="text-center mt-4">
                    <v-pagination
                      v-model="teamsPage"
                      :length="teamsPageCount"
                      :total-visible="7"
                    ></v-pagination>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Users Tab -->
            <v-window-item value="users">
              <v-card>
                <v-card-title>User Management</v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="[
                      { title: 'Username', key: 'username' },
                      { title: 'Email', key: 'email' },
                      { title: 'Actions', key: 'actions', sortable: false },
                    ]"
                    :items="paginatedUsers"
                    :loading="loading"
                    item-value="userId"
                    hide-default-footer
                  >
                    <template #item.actions="{ item }">
                      <v-btn
                        icon="mdi-bell"
                        size="small"
                        color="warning"
                        @click="notifyUser(item)"
                        class="mr-2"
                      ></v-btn>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        color="error"
                        @click="deleteUser(item)"
                        :loading="deleting"
                        :disabled="item.username === 'admin'"
                      ></v-btn>
                    </template>
                  </v-data-table>

                  <!-- Users Pagination -->
                  <div class="text-center mt-4">
                    <v-pagination
                      v-model="usersPage"
                      :length="usersPageCount"
                      :total-visible="7"
                    ></v-pagination>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Announcements Tab -->
            <v-window-item value="announcements">
              <v-card>
                <v-card-title>Announcement Management</v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="[
                      { title: 'Title', key: 'title', width: '30%' },
                      { title: 'Subtitle', key: 'subtitle', width: '25%' },
                      { title: 'Author', key: 'createdByUsername', width: '25%' },
                      { title: 'Actions', key: 'actions', sortable: false, width: '20%' },
                    ]"
                    :items="paginatedAnnouncements"
                    :loading="loading"
                    item-value="_id"
                    hide-default-footer
                  >
                    <template #item.subtitle="{ item }">
                      <span class="text-caption text-grey">
                        {{ item.subtitle || '(No subtitle)' }}
                      </span>
                    </template>

                    <template #item.actions="{ item }">
                      <v-btn
                        icon="mdi-pencil"
                        size="small"
                        color="primary"
                        @click="editAnnouncement(item)"
                        class="mr-2"
                      ></v-btn>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        color="error"
                        @click="deleteAnnouncement(item)"
                        :loading="deleting"
                      ></v-btn>
                    </template>
                  </v-data-table>

                  <!-- Announcements Pagination -->
                  <div class="text-center mt-4">
                    <v-pagination
                      v-model="announcementsPage"
                      :length="announcementsPageCount"
                      :total-visible="7"
                    ></v-pagination>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>
        </v-col>
      </v-row>
    </v-container>

    <!-- Notify User Dialog -->
    <v-dialog v-model="notifyDialog" max-width="500px">
      <v-card>
        <v-card-title>Send Notification</v-card-title>
        <v-card-text>
          <p class="mb-3">
            Send a notification to <strong>{{ selectedUser.username }}</strong>
          </p>
          <v-textarea
            v-model="notificationMessage"
            label="Message"
            variant="outlined"
            rows="4"
            counter="500"
            maxlength="500"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="notifyDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="sendNotification" :disabled="!notificationMessage.trim()">
            Send Notification
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Announcement Dialog -->
    <UpdateAnnouncements
      v-if="loading === false && selectedAnnouncement._id"
      v-model:dialog="editAnnouncementDialog"
      :announcement="selectedAnnouncement"
      :teamId="selectedAnnouncement.teamId"
      :user-props="user"
      @announcement-updated="onAnnouncementUpdated"
    />
  </div>
</template>

<style scoped>
.admin-view {
  padding: 20px;
}

/* Make all data table headers bold */
:deep(.v-data-table-header__content) {
  font-weight: bold !important;
}
</style>
