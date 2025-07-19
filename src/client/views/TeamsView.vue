<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import NewTeams from '../components/NewTeams.vue'
import NewMembers from '../components/NewMembers.vue'
import DeleteTeams from '../components/DeleteTeams.vue'

const { getUserByAccessToken } = AuthStore

// --- Router Instance ---
const router = useRouter()

const userLoaded = ref(false)
const teamsThatUserIsAdmin = ref([])
const userTeams = ref([])

// --- User State ---
const user = ref({
  userId: '',
  username: '',
  email: '',
})

onMounted(async () => {
  userLoaded.value = false
  const userFromToken = await getUserByAccessToken()
  if (userFromToken) {
    setUserToUserToken(userFromToken)
    await getTeamThatUserIsAdmin()
    await fetchUserTeams()
    userLoaded.value = true
  } else {
    user.value.username = 'Guest'
  }
})

// --- Reactive State ---
const isCreatingNewTeam = ref(false)
const isAddingNewMember = ref(false)
const isDeletingTeam = ref(false)

const isLoggedIn = ref(false)
const commentDialog = ref(false)
const selectedProject = ref(null)
const newCommentText = ref('')

// --- Methods ---

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const getTeamThatUserIsAdmin = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/user/${user.value.userId}/admin`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    teamsThatUserIsAdmin.value = await response.json()
    console.log('Fetched teams that user is admin of:', teamsThatUserIsAdmin.value)
  } catch (error) {
    console.error('Failed to fetch teams:', error)
  }
}

const fetchUserTeams = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/user/${user.value.userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    userTeams.value = await response.json()
    console.log('Fetched User Teams:', userTeams.value)
  } catch (error) {
    console.error('Failed to fetch User Teams:', error)
  }
}

const handleTeamUpdated = async () => {
  await getTeamThatUserIsAdmin()
  await fetchUserTeams()
}

const navigateToTeam = (teamId) => {
  router.push(`/teams/${teamId}`)
}

const getProgressColor = (percentage) => {
  // Create a gradient from red (0%) to green (100%) with 8 variants (12.5% intervals)
  if (percentage <= 12.5) {
    return 'red-darken-2' // 0-12.5%: Deep red
  } else if (percentage <= 25) {
    return 'red' // 12.5-25%: Red
  } else if (percentage <= 37.5) {
    return 'orange-darken-2' // 25-37.5%: Deep orange
  } else if (percentage <= 50) {
    return 'orange' // 37.5-50%: Orange
  } else if (percentage <= 62.5) {
    return 'yellow-darken-2' // 50-62.5%: Dark yellow
  } else if (percentage <= 75) {
    return 'yellow' // 62.5-75%: Yellow
  } else if (percentage <= 87.5) {
    return 'light-green' // 75-87.5%: Light green
  } else {
    return 'green' // 87.5-100%: Green
  }
}
</script>

<template>
  <!-- Main content area -->

  <v-container fluid>
    <v-row class="align-center mb-6">
      <v-col justify="center" cols="12">
        <h1 class="text-h4 welcome-header">Welcome Back, {{ user.username }}!</h1>
        <p class="text-grey">Here's a look at your current teams.</p>
      </v-col>
    </v-row>

    <!-- Projects Grid -->
    <v-row>
      <!-- Title: -->
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4 text-center">Options</h2>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col cols="12" md="4">
        <v-card
          class="mb-4 project-card rounded-lg"
          flat
          @click="isCreatingNewTeam = !isCreatingNewTeam"
          color="blue-darken-2"
        >
          <v-card-item class="text-center">
            <v-card-title
              class="font-weight-bold text-h5"
              v-tooltip:bottom="'Click to create new team'"
              ><v-icon start>mdi-plus</v-icon> Create New Team</v-card-title
            >
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          class="mb-4 project-card rounded-lg"
          flat
          @click="isAddingNewMember = !isAddingNewMember"
          color="success"
        >
          <v-card-item class="text-center">
            <v-card-title
              class="font-weight-bold text-h5"
              v-tooltip:bottom="'Click to add new members'"
              ><v-icon start>mdi-account-plus</v-icon>
              Add New Members
            </v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          class="mb-4 project-card rounded-lg"
          flat
          @click="isDeletingTeam = !isDeletingTeam"
          color="red-lighten-2"
        >
          <v-card-item class="text-center">
            <v-card-title
              class="font-weight-bold text-h5"
              v-tooltip:bottom="'Click to delete a team'"
              ><v-icon start>mdi-delete</v-icon> Delete A Team</v-card-title
            >
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
    <NewTeams
      v-if="userLoaded"
      v-model:dialog="isCreatingNewTeam"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
      @team-created="handleTeamUpdated"
    />
    <NewMembers
      v-if="userLoaded"
      v-model:dialog="isAddingNewMember"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
    />
    <DeleteTeams
      v-if="userLoaded"
      v-model:dialog="isDeletingTeam"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
      @teams-deleted="handleTeamUpdated"
    />

    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4 text-center">Your Teams</h2>
      </v-col>
    </v-row>

    <v-row v-if="userTeams.length > 0" class="mb-6">
      <transition-group name="scroll-x" tag="div" class="w-100 d-flex flex-wrap" appear>
        <v-col
          v-for="(team, index) in userTeams"
          :key="team.teamId"
          cols="12"
          sm="6"
          md="4"
          :style="{ 'transition-delay': `${index * 100}ms` }"
        >
          <v-card
            class="project-card rounded-lg elevation-1"
            flat
            @click="navigateToTeam(team.teamId)"
          >
            <v-card-item>
              <v-card-title class="font-weight-bold text-wrap">{{ team.title }}</v-card-title>
              <v-card-subtitle>{{ team.category }}</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              {{ team.description }}
            </v-card-text>

            <!-- Progress Section -->
            <v-card-text v-if="team.progress" class="pt-0">
              <div class="progress-section">
                <div class="progress-label mb-2">
                  <span class="text-caption text-grey-darken-1">
                    Weight: {{ team.progress.completedWeight }}/{{ team.progress.totalWeight }}
                  </span>
                  <span class="text-caption text-grey-darken-1 ml-2">
                    {{ team.progress.progressPercentage }}%
                  </span>
                </div>
                <v-progress-linear
                  :model-value="team.progress.progressPercentage"
                  height="8"
                  rounded
                  :color="getProgressColor(team.progress.progressPercentage)"
                  bg-color="grey-lighten-3"
                  class="progress-bar"
                ></v-progress-linear>
              </div>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions class="pa-4">
              <v-chip v-if="team.role === 'Member'" color="primary" size="small">
                {{ team.role }}
              </v-chip>
              <v-chip v-else-if="team.role === 'Admin'" color="red-lighten-2" size="small">
                {{ team.role }}
              </v-chip>
              <v-spacer></v-spacer>
              <v-btn icon size="small">
                <v-icon>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </transition-group>
    </v-row>
    <v-row v-else>
      <v-col cols="12" class="text-center">
        <v-alert type="info">You are not a member of any teams yet.</v-alert>
      </v-col>
    </v-row>
  </v-container>

  <!-- Floating Action Button to add new projects -->
  <v-fab
    v-if="isLoggedIn"
    icon="mdi-plus"
    location="bottom end"
    size="large"
    app
    appear
    class="mb-16"
    color="primary"
  ></v-fab>
</template>

<style scoped>
/* Scoped styles ensure these only apply to this component */
.project-card {
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
}

.welcome-header {
  font-weight: 700;
  color: #333;
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

/* Progress Section Styles */
.progress-section {
  margin-top: 0.5rem;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.progress-bar {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.progress-bar:hover {
  transform: scaleY(1.2);
}
</style>
