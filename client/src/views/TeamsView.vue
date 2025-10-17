<script setup>
import { ref, onMounted, computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { fetchJSON } from '../scripts/apiClient.js'
import NewTeams from '../components/NewTeams.vue'
import { useComponentCache } from '../composables/useComponentCache.js'

// Define component name for keep-alive
defineOptions({
  name: 'TeamsView',
})

const authStore = useAuthStore()
const { needsRefresh, markAsRefreshed } = useComponentCache()

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

const initializeTeamsData = async () => {
  userLoaded.value = false
  isLoadingTeams.value = true
  const userFromToken = await authStore.getUserByAccessToken()
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
}

onMounted(async () => {
  await initializeTeamsData()
})

// Handle component reactivation when navigating back
onActivated(async () => {
  console.log('TeamsView: Component reactivated (keep-alive working!)')
  if (needsRefresh('TeamsView')) {
    console.log('🔃 TeamsView: Refreshing data due to explicit refresh request')
    await initializeTeamsData()
    markAsRefreshed('TeamsView')
  } else {
    console.log('TeamsView: Using cached data (no refresh needed)')
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

// Filter state
const selectedCategory = ref('')

// Team categories from server model
const teamCategories = [
  'Development',
  'Design',
  'Marketing',
  'Sales',
  'Support',
  'Operations',
  'Finance',
  'Human Resources',
  'Legal',
  'Product Management',
  'Data Science',
  'Research and Development',
  'Other',
]

// Computed property for category items with counts
const categoryItemsWithCounts = computed(() => {
  return teamCategories
    .map((category) => {
      const count = userTeams.value.filter((team) => team.category === category).length
      return {
        title: count > 0 ? `${category} (${count})` : category,
        value: category,
        disabled: count === 0,
      }
    })
    .filter((item) => !item.disabled) // Only show categories that have teams
})

// Computed properties for search and pagination
const filteredTeams = computed(() => {
  let teams = [...userTeams.value]

  // Apply search filter
  if (searchQuery.value) {
    teams = teams.filter((team) =>
      team.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  // Apply category filter
  if (selectedCategory.value) {
    teams = teams.filter((team) => team.category === selectedCategory.value)
  }

  return teams
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

// Clear all filters
const clearFilters = () => {
  selectedCategory.value = ''
  resetPagination()
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
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams/admin`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!ok) {
      throw new Error(data?.message || `Failed to fetch admin teams (Status ${status})`)
    }
    teamsThatUserIsAdmin.value = data
    console.log('Fetched teams that user is admin of:', teamsThatUserIsAdmin.value)
  } catch (error) {
    console.log('Failed to fetch teams:', error)
    teamsThatUserIsAdmin.value = []
  }
}

const fetchUserTeams = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const { ok, status, data } = await fetchJSON(`${PORT}/api/teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!ok) {
      throw new Error(data?.message || `Failed to fetch user teams (Status ${status})`)
    }
    userTeams.value = data
    console.log('Fetched User Teams:', userTeams.value)
  } catch (error) {
    console.log('Failed to fetch User Teams:', error)
    userTeams.value = []
  }
}

const handleTeamUpdated = async () => {
  isLoadingTeams.value = true
  await getTeamThatUserIsAdmin()
  await fetchUserTeams()
  isLoadingTeams.value = false
}

// Refresh handler that works with cache system
const handleRefresh = async () => {
  await initializeTeamsData()
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
    <!-- Header Section -->
    <v-row class="align-center mb-6">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold">Teams</h1>
        <p class="text-h6 text-grey">Manage and explore your teams</p>
      </v-col>
      <v-col cols="12" md="4" class="text-right">
        <v-btn
          @click="handleRefresh"
          :loading="isLoadingTeams"
          color="primary"
          size="large"
          variant="outlined"
          class="mr-2"
        >
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <NewTeams
      v-if="userLoaded"
      v-model:dialog="isCreatingNewTeam"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
      @team-created="handleTeamUpdated"
    />

    <!-- Search Bar with Filters -->
    <v-row v-if="!isLoadingTeams && userTeams.length > 0" class="mb-4 align-center">
      <!-- Search Field -->
      <v-col cols="12" md="8" lg="6">
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

      <!-- Category Filter -->
      <v-col cols="12" md="4" lg="4">
        <v-select
          v-model="selectedCategory"
          @update:model-value="resetPagination"
          :items="categoryItemsWithCounts"
          item-title="title"
          item-value="value"
          label="Filter by Category"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          prepend-inner-icon="mdi-filter"
        ></v-select>
      </v-col>
    </v-row>

    <!-- Loading Skeleton -->
    <v-row v-if="isLoadingTeams" class="mb-6">
      <div class="teams-container w-100">
        <div class="w-100">
          <v-col v-for="n in 6" :key="`skeleton-${n}`" cols="12" sm="6" md="4" class="d-flex">
            <v-card class="team-card rounded-lg elevation-1 flex-fill" flat>
              <v-card-item>
                <v-skeleton-loader type="list-item-two-line" class="mb-2"></v-skeleton-loader>
              </v-card-item>
              <v-card-text>
                <v-skeleton-loader type="paragraph" max-width="100%"></v-skeleton-loader>
              </v-card-text>

              <!-- Progress Section Skeleton -->
              <v-card-text class="pt-0">
                <div class="progress-section">
                  <div class="progress-label mb-2">
                    <v-skeleton-loader type="text" width="80px" height="12px"></v-skeleton-loader>
                    <v-skeleton-loader type="text" width="30px" height="12px"></v-skeleton-loader>
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
                <v-skeleton-loader type="chip" width="60px"></v-skeleton-loader>
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
                :id="'team-card-' + index"
                cols="12"
                sm="6"
                md="4"
                class="d-flex"
                :style="{ 'transition-delay': `${index * 75}ms` }"
              >
                <v-card
                  class="team-card rounded-lg elevation-1 flex-fill"
                  flat
                  :data-team-id="team.teamId"
                  :data-team-title="team.title"
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
                  <v-card-text v-if="team.progress.progressPercentage >= 0" class="pt-0">
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
                      <span class="text-caption text-grey-darken-1"> No Tasks Found </span>
                    </div>
                  </v-card-text>
                  <v-divider></v-divider>
                  <v-card-actions class="pa-4">
                    <v-chip :color="team.roleColor || 'grey'" size="small">
                      {{ team.roleLabel || team.baseRole }}
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
    <v-btn
      v-if="userLoaded"
      class="fixed-float-btn"
      color="primary"
      fab
      @click="isCreatingNewTeam = !isCreatingNewTeam"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>
  </v-container>
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
  min-height: 250px;
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

.fixed-float-btn {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  z-index: 1000 !important;
  width: 64px !important;
  height: 64px !important;
  min-width: 56px !important;
  border-radius: 50% !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.3s ease !important;
}

.fixed-float-btn:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25) !important;
}

.fixed-float-btn .v-icon {
  font-size: 24px !important;
}

/* Filter controls styling */
.gap-2 > * + * {
  margin-left: 8px;
}

@media (max-width: 960px) {
  .gap-2 {
    flex-wrap: wrap;
    gap: 4px !important;
  }

  .gap-2 > * + * {
    margin-left: 0;
  }
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
