<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import NewTasks from '../components/NewTasks.vue'

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
    // await fetchTeamDetails()
    // await fetchTeamTasks()
    await fetchTeamMembers()
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

const fetchTeamDetails = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/teams/${teamId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      team.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch team details:', error)
  }
}

const fetchTeamTasks = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `http://localhost:${PORT}/api/tasks/team/${teamId}/user/${user.value.userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.ok) {
      tasks.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch team tasks:', error)
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
        console.error('Failed to fetch team members:',)
        teamMembers.value = []
    } else {
        teamMembers.value = result
        console.log('Fetched team members:', teamMembers.value)
    }
  } catch (error) {
    console.error('Failed to fetch team members:', error)
  }
}

const goBackToTeams = () => {
  router.push('/teams')
}

const submitTask = (taskId) => {
  // Implementation for task submission
  console.log('Submitting task:', taskId)
}

const getTaskStatusColor = (task) => {
  if (task.submitted) return 'success'
  if (new Date(task.dueDate) < new Date()) return 'error'
  return 'warning'
}
</script>

<template>
  <v-container fluid>
    <!-- Header with back button -->
    <v-row class="align-center mb-4">
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
    <!-- Team navigation tabs -->
    <v-row class="align-center mb-6">
      <v-col cols="12" lg="8" xl="9">
        <v-tabs v-model="activeTab">
          <v-tab value="tasks">Tasks</v-tab>
          <v-tab value="announcements">Announcements</v-tab>
          <v-tab value="members">Members</v-tab>
          <v-tab value="submit">Submit Task</v-tab>
        </v-tabs>
      </v-col>
      <v-col cols="12" lg="4" xl="3" class="text-right">
        <v-btn
          @click="newTaskDialog = !newTaskDialog"
          variant="outlined"
          color="primary"
          class="w-100"
          size="large"
        >
          <v-icon start>mdi-file-document-plus-outline</v-icon>
          Add new tasks
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tab content -->
    <v-window v-model="activeTab">
      <!-- Tasks Tab -->
      <v-window-item value="tasks">
        <v-row>
          <v-col cols="12">
            <h2 class="text-h5 mb-4">Your Tasks</h2>
          </v-col>
          <v-col v-for="task in tasks" :key="task._id" cols="12" md="6" lg="4">
            <v-card class="mb-4">
              <v-card-item>
                <v-card-title>{{ task.title }}</v-card-title>
                <v-card-subtitle>
                  <v-chip :color="getTaskStatusColor(task)" size="small">
                    {{ task.submitted ? 'Completed' : 'Pending' }}
                  </v-chip>
                </v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <p>{{ task.description }}</p>
                <div class="d-flex justify-space-between text-caption">
                  <span>Priority: {{ task.priority }}</span>
                  <span>Weight: {{ task.weighted }}</span>
                </div>
                <div class="text-caption text-grey mt-2">
                  Due: {{ new Date(task.dueDate).toLocaleDateString() }}
                </div>
              </v-card-text>
              <v-card-actions v-if="!task.submitted">
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="submitTask(task._id)" variant="outlined">
                  Submit
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Announcements Tab -->
      <v-window-item value="announcements">
        <v-row>
          <v-col cols="12">
            <h2 class="text-h5 mb-4">Team Announcements</h2>
            <v-card>
              <v-card-text>
                <p class="text-center text-grey">No announcements yet.</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Members Tab -->
      <v-window-item value="members">
        <v-row>
          <v-col cols="12">
            <h2 class="text-h5 mb-4">Team Members</h2>
          </v-col>
          <v-col v-for="member in teamMembers" :key="member.userId" cols="12" md="4" >
            <v-card class="mb-2" variant="outlined" :color="getRoleColor(member.role)">
              <v-card-item>
                <v-card-title>{{ member.username }}</v-card-title>
                <v-card-subtitle>{{ member.role }}</v-card-subtitle>
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Submit Task Tab -->
      <v-window-item value="submit">
        <v-row>
          <v-col cols="12" md="8" lg="6">
            <h2 class="text-h5 mb-4">Submit a Task</h2>
            <v-card>
              <v-card-text>
                <v-form>
                  <v-text-field label="Task Title" variant="outlined" class="mb-4"></v-text-field>
                  <v-textarea
                    label="Task Description"
                    variant="outlined"
                    rows="4"
                    class="mb-4"
                  ></v-textarea>
                  <v-file-input
                    label="Upload File (optional)"
                    variant="outlined"
                    class="mb-4"
                  ></v-file-input>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="outlined">Submit</v-btn>
              </v-card-actions>
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
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
