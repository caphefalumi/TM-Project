<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import NewTeams from '../components/NewTeams.vue'
import DeleteTeams from '../components/DeleteTeams.vue'

const { getUserByAccessToken } = AuthStore

// --- Router Instance ---
const router = useRouter()

const userLoaded = ref(false)
const teamsThatUserIsAdmin = ref([])
const userTeams = ref([])
const isLoadingTeams = ref(true)

// --- User State ---
const user = ref({
  userId: '',
  username: '',
  email: '',
})

onMounted(async () => {
  userLoaded.value = false
  isLoadingTeams.value = true
  const userFromToken = await getUserByAccessToken()
  if (userFromToken) {
    setUserToUserToken(userFromToken)
    await getTeamThatUserIsAdmin()
    await fetchUserTeams()
    userLoaded.value = true
    isLoadingTeams.value = false
  } else {
    user.value.username = 'Guest'
    isLoadingTeams.value = false
  }
})

// --- Reactive State ---
const isCreatingNewTeam = ref(false)
const isDeletingTeam = ref(false)

const isLoggedIn = ref(false)

// Search and pagination state
const searchQuery = ref('')
const currentPage = ref(1)
const teamsPerPage = 6
const isTransitioning = ref(false)

// Computed properties for search and pagination
const filteredTeams = computed(() => {
  if (!searchQuery.value) {
    return userTeams.value
  }
  return userTeams.value.filter((team) =>
    team.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredTeams.value.length / teamsPerPage)
})

const paginatedTeams = computed(() => {
  const start = (currentPage.value - 1) * teamsPerPage
  const end = start + teamsPerPage
  return filteredTeams.value.slice(start, end)
})

// Reset to first page when search changes
const resetPagination = () => {
  currentPage.value = 1
}

// Handle pagination with smooth transition
const handlePageChange = (newPage) => {
  isTransitioning.value = true
  setTimeout(() => {
    currentPage.value = newPage
    setTimeout(() => {
      isTransitioning.value = false
    }, 50)
  }, 150)
}

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
    const response = await fetch(`${PORT}/api/teams/admin`, {
      method: 'GET',
      credentials: 'include',
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
    const response = await fetch(`${PORT}/api/teams`, {
      method: 'GET',
      credentials: 'include',
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
  isLoadingTeams.value = true
  await getTeamThatUserIsAdmin()
  await fetchUserTeams()
  isLoadingTeams.value = false
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
    <v-row id="tour-teams-overview" class="align-center mb-6">
      <v-col justify="center" cols="12">
        <div v-if="!userLoaded">
          <v-skeleton-loader
            type="heading"
            width="300px"
            class="mb-2"
          ></v-skeleton-loader>
          <v-skeleton-loader
            type="text"
            width="250px"
          ></v-skeleton-loader>
        </div>
        <div v-else>
          <h1 class="text-h4 welcome-header">Welcome Back, {{ user.username }}!</h1>
          <p class="text-grey">Here's a look at your current teams.</p>
        </div>
      </v-col>
    </v-row>

    <!-- Projects Grid -->
    <v-row>
      <!-- Title: -->
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4 text-center">Options</h2>
      </v-col>
    </v-row>

    <v-row id="tour-team-options" justify="center">
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

    <!-- Search Bar -->
    <v-row id="tour-team-search" v-if="!isLoadingTeams && userTeams.length > 0" justify="center" class="mb-4">
      <v-col cols="12" md="6" lg="4">
        <v-text-field
          v-model="searchQuery"
          @input="resetPagination"
          label="Search teams..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        ></v-text-field>
      </v-col>
    </v-row>

    <!-- Loading Skeleton -->
    <v-row v-if="isLoadingTeams" class="mb-6">
      <div class="teams-container w-100">
        <div class="w-100">
          <v-col
            v-for="n in 6"
            :key="`skeleton-${n}`"
            cols="12"
            sm="6"
            md="4"
            class="d-flex"
          >
            <v-card class="team-card rounded-lg elevation-1 flex-fill" flat>
              <v-card-item>
                <v-skeleton-loader
                  type="list-item-two-line"
                  class="mb-2"
                ></v-skeleton-loader>
              </v-card-item>
              <v-card-text>
                <v-skeleton-loader
                  type="paragraph"
                  max-width="100%"
                ></v-skeleton-loader>
              </v-card-text>

              <!-- Progress Section Skeleton -->
              <v-card-text class="pt-0">
                <div class="progress-section">
                  <div class="progress-label mb-2">
                    <v-skeleton-loader
                      type="text"
                      width="80px"
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
              </v-card-text>

              <v-divider></v-divider>
              <v-card-actions class="pa-4">
                <v-skeleton-loader
                  type="chip"
                  width="60px"
                ></v-skeleton-loader>
                <v-spacer></v-spacer>
                <v-skeleton-loader
                  type="button"
                  width="32px"
                  height="32px"
                  class="rounded-circle"
                ></v-skeleton-loader>
              </v-card-actions>
            </v-card>
          </v-col>
        </div>
      </div>
    </v-row>

    <!-- Teams Content -->
    <v-row v-else-if="!isLoadingTeams && userTeams.length > 0" class="mb-6">
      <!-- No results message when search returns no teams -->
      <v-col v-if="filteredTeams.length === 0" cols="12" class="text-center">
        <v-alert type="info">
          No teams found matching "{{ searchQuery }}". Try a different search term.
        </v-alert>
      </v-col>

      <!-- Teams grid -->
      <div v-else class="teams-container w-100">
        <transition name="page-fade" mode="out-in">
          <div :key="currentPage" class="w-100">
            <transition-group name="card-slide" tag="div" class="w-100" appear>
              <v-col
                v-for="(team, index) in paginatedTeams"
                :key="team.teamId"
                cols="12"
                sm="6"
                md="4"
                class="d-flex"
                :style="{ 'transition-delay': `${index * 75}ms` }"
              >
                <v-card
                  id="tour-team-card"
                  class="team-card rounded-lg elevation-1 flex-fill"
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
                          Weight: {{ team.progress.completedWeight }}/{{
                            team.progress.totalWeight
                          }}
                        </span>
                        <span class="text-caption text-grey-darken-1 ml-2">
                          {{ team.progress.progressPercentage }}%
                        </span>
                      </div>
                      <v-progress-linear
                        :model-value="team.progress.progressPercentage"
                        height="8"
                        rounded
                        :color="
                          team.progress.progressPercentage > 0
                            ? getProgressColor(team.progress.progressPercentage)
                            : 'grey-lighten-2'
                        "
                        bg-color="grey-lighten-3"
                        class="progress-bar"
                      ></v-progress-linear>
                    </div>
                  </v-card-text>

                  <!-- Empty Progress Section when no progress data -->
                  <v-card-text v-else class="pt-0">
                    <div class="progress-section">
                      <div class="progress-label mb-2">
                        <span class="text-caption text-grey-darken-1"> Weight: 0/0 </span>
                        <span class="text-caption text-grey-darken-1 ml-2"> 0% </span>
                      </div>
                    </div>
                  </v-card-text>
                  <v-divider></v-divider>
                  <v-card-actions class="pa-4">
                    <v-chip :color="team.roleColor || 'grey'" size="small">
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
          </div>
        </transition>
      </div>
    </v-row>

    <!-- Pagination -->
    <v-row
      v-if="!isLoadingTeams && userTeams.length > 0 && filteredTeams.length > teamsPerPage"
      justify="center"
      class="mb-6"
    >
      <v-col cols="auto">
        <v-pagination
          :model-value="currentPage"
          @update:model-value="handlePageChange"
          :length="totalPages"
          :total-visible="5"
          color="primary"
          density="comfortable"
        ></v-pagination>
      </v-col>
    </v-row>
    <v-row v-if="!isLoadingTeams && userTeams.length === 0" class="mb-6">
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

/* Page transition for pagination */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.3s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Card slide transition for individual cards */
.card-slide-enter-active {
  transition: all 0.5s ease;
}

.card-slide-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}

.card-slide-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1);
}

/* Teams container for smooth transitions */
.teams-container {
  min-height: 300px;
  position: relative;
  width: 100%;
}

.teams-container .w-100 {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
}

/* Team cards specific styling */
.team-card {
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
  height: auto;
  max-height: 350px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.team-card .v-card-text,
.team-card .v-card-item,
.team-card .v-card-actions {
  flex-shrink: 0;
}

.team-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
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
  background-color: #eeeeee;
}

.progress-bar:hover {
  transform: scaleY(1.2);
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
