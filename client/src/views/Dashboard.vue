<script setup>
import { ref, onMounted, computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { fetchJSON } from '../scripts/apiClient.js'
import { useComponentCache } from '../composables/useComponentCache.js'

// Define component name for keep-alive
defineOptions({
  name: 'Dashboard',
})

const authStore = useAuthStore()
const { needsRefresh, markAsRefreshed } = useComponentCache()

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const tasks = ref([])
const loading = ref(false)

// Filter and sort controls
const filters = ref({
  submitted: false,
  highPriority: false,
  pending: false,
})

const sortBy = ref('priority') // 'priority', 'weighted', 'startDate', 'dueDate'
const sortOrder = ref('asc') // 'asc' or 'desc'

const sortOptions = [
  { value: 'priority', title: 'By Priority' },
  { value: 'weighted', title: 'By Weight' },
  { value: 'startDate', title: 'By Start Date' },
  { value: 'dueDate', title: 'By Due Date' },
]

onMounted(async () => {
  const userToken = await authStore.getUserByAccessToken()
  if (userToken) {
    setUserToUserToken(userToken)
    await fetchTasks()
  } else {
    console.log('No user token found, redirecting to login')
    router.push('/login')
  }
})

// Handle component reactivation when navigating back
onActivated(async () => {
  console.log('Dashboard: Component reactivated (keep-alive working!)')
  if (needsRefresh('Dashboard')) {
    console.log('🔃 Dashboard: Refreshing data due to explicit refresh request')
    const userToken = await getUserByAccessToken()
    if (userToken) {
      setUserToUserToken(userToken)
      await fetchTasks()
    }
    markAsRefreshed('Dashboard')
  } else {
    console.log('Dashboard: Using cached data (no refresh needed)')
  }
})

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
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

const getPriorityValue = (priority) => {
  const values = {
    Urgent: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Optional: 1,
  }
  return values[priority] || 0
}

const getTaskColor = (task) => {
  if (task.submitted === true) {
    return 'success'
  } else {
    return getPriorityColor(task.priority)
  }
}

const getTaskIcon = (task) => {
  if (task.submitted === true) {
    return 'mdi-check-circle'
  } else if (new Date(task.dueDate) < new Date()) {
    return 'mdi-alert-circle'
  } else {
    return 'mdi-clock-outline'
  }
}

// Filtered and sorted tasks
const filteredAndSortedTasks = computed(() => {
  let filtered = [...tasks.value]

  // Apply filters
  if (filters.value.submitted) {
    filtered = filtered.filter((task) => task.submitted === true)
  }

  if (filters.value.highPriority) {
    filtered = filtered.filter((task) => task.priority === 'High' || task.priority === 'Urgent')
  }

  if (filters.value.pending) {
    const currentDate = new Date()
    filtered = filtered.filter((task) => {
      const startDate = new Date(task.startDate)
      const dueDate = new Date(task.dueDate)
      return !task.submitted && currentDate >= startDate && currentDate <= dueDate
    })
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let aValue, bValue

    switch (sortBy.value) {
      case 'priority':
        aValue = getPriorityValue(a.priority)
        bValue = getPriorityValue(b.priority)
        break
      case 'weighted':
        aValue = a.weighted
        bValue = b.weighted
        break
      case 'startDate':
        aValue = new Date(a.startDate)
        bValue = new Date(b.startDate)
        break
      case 'dueDate':
        aValue = new Date(a.dueDate)
        bValue = new Date(b.dueDate)
        break
      default:
        return 0
    }

    if (sortOrder.value === 'desc') {
      return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    }
  })

  return filtered
})

// Task statistics
const taskStats = computed(() => {
  const total = tasks.value.length
  const submitted = tasks.value.filter((task) => task.submitted).length
  const overdue = tasks.value.filter(
    (task) => !task.submitted && new Date(task.dueDate) < new Date(),
  ).length
  const notStarted = tasks.value.filter(
    (task) => !task.submitted && new Date(task.startDate) > new Date(),
  ).length
  const pending = total - submitted - overdue - notStarted

  return {
    total,
    submitted,
    overdue,
    notStarted,
    pending,
    completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
  }
})

const fetchTasks = async () => {
  loading.value = true
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const { ok, status, data } = await fetchJSON(`${PORT}/api/tasks/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!ok) {
      console.log('Failed to fetch tasks:', data?.message || `Status ${status}`)
      throw new Error(data?.message || 'Failed to fetch tasks')
    } else {
      console.log('Tasks fetched successfully:', data.tasks)
      tasks.value = data.tasks || []
    }
  } catch (error) {
    console.log('Error fetching tasks:', error)
    tasks.value = []
  } finally {
    loading.value = false
  }
}

// Refresh handler that works with cache system
const handleRefresh = async () => {
  await fetchTasks()
}

// Navigate to team when task is clicked
const navigateToTeam = (task) => {
  console.log('Navigating to team for task:', task)
  if (task && task.teamId) {
    console.log('Navigating to team ID:', task.teamId)
    router.push(`/teams/${task.teamId}`)
  } else {
    console.log('Task or teamId is missing:', task)
  }
}

// Format date for display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Clear all filters
const clearFilters = () => {
  filters.value.submitted = false
  filters.value.highPriority = false
  filters.value.pending = false
}

// Toggle sort order
const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <v-row class="align-center mb-6">
      <v-col cols="12" md="6">
        <h1 class="text-h4 font-weight-bold">Hi, {{ user.username }}!</h1>
        <p class="text-h6 text-grey">Here's your task overview and calendar</p>
      </v-col>
      <v-col cols="12" md="6">
        <div class="d-flex flex-column flex-md-row gap-2">
          <v-btn
            @click="handleRefresh"
            :loading="loading"
            color="primary"
            size="large"
            variant="outlined"
            class="flex-grow-1"
          >
            <v-icon start>mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Task Statistics Cards -->

    <v-row class="mb-6">
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="gray" variant="tonal">
          <v-card-title class="text-h3 font-weight-bold">{{ taskStats.notStarted }}</v-card-title>
          <v-card-subtitle class="text-h6">Not Started</v-card-subtitle>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="orange-darken-4" variant="tonal">
          <v-card-title class="text-h3 font-weight-bold">{{ taskStats.pending }}</v-card-title>
          <v-card-subtitle class="text-h6">Pending</v-card-subtitle>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="error" variant="tonal">
          <v-card-title class="text-h3 font-weight-bold">{{ taskStats.overdue }}</v-card-title>
          <v-card-subtitle class="text-h6">Overdue</v-card-subtitle>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="green-darken-1" variant="tonal">
          <v-card-title class="text-h3 font-weight-bold">{{ taskStats.submitted }}</v-card-title>
          <v-card-subtitle class="text-h6">Completed</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <!-- Progress Overview -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-chart-arc</v-icon>
            Overall Progress
          </v-card-title>
          <v-card-text>
            <div class="d-flex align-center mb-2">
              <span class="text-h6 mr-4">{{ taskStats.completionRate }}% Complete</span>
              <v-spacer></v-spacer>
              <span>{{ taskStats.submitted }} of {{ taskStats.total }} tasks</span>
            </div>
            <v-progress-linear
              :model-value="taskStats.completionRate"
              color="success"
              height="12"
              rounded
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Calendar Section -->
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="pb-2">
            <v-container fluid class="pa-0">
              <v-row class="align-center">
                <!-- Title Section -->
                <v-col cols="12" md="6">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-table</v-icon>
                    Tasks Table
                  </div>
                </v-col>

                <!-- Filter and Sort Controls -->
                <v-col cols="12" md="6">
                  <div class="d-flex align-center gap-2 justify-end justify-md-end">
                    <!-- Filter Section -->
                    <v-menu :close-on-content-click="false">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          variant="outlined"
                          :color="
                            filters.submitted || filters.highPriority || filters.pending
                              ? 'primary'
                              : 'default'
                          "
                        >
                          <v-icon start>mdi-filter</v-icon>
                          Filter
                          <v-badge
                            v-if="filters.submitted || filters.highPriority || filters.pending"
                            :content="
                              Number(filters.submitted) +
                              Number(filters.highPriority) +
                              Number(filters.pending)
                            "
                            color="primary"
                            inline
                          ></v-badge>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-item>
                          <v-checkbox
                            v-model="filters.submitted"
                            label="Submitted Tasks"
                            hide-details
                          ></v-checkbox>
                        </v-list-item>
                        <v-list-item>
                          <v-checkbox
                            v-model="filters.highPriority"
                            label="High & Urgent Priority"
                            hide-details
                          ></v-checkbox>
                        </v-list-item>
                        <v-list-item>
                          <v-checkbox
                            v-model="filters.pending"
                            label="Pending Tasks"
                            hide-details
                          ></v-checkbox>
                        </v-list-item>
                        <v-divider class="my-2"></v-divider>
                        <v-list-item>
                          <v-btn @click="clearFilters" variant="text" color="error" block>
                            Clear Filters
                          </v-btn>
                        </v-list-item>
                      </v-list>
                    </v-menu>

                    <!-- Sort Section -->
                    <v-select
                      v-model="sortBy"
                      :items="sortOptions"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="min-width: 130px; max-width: 150px"
                    ></v-select>

                    <v-btn
                      @click="toggleSortOrder"
                      variant="outlined"
                      :color="sortOrder === 'desc' ? 'primary' : 'default'"
                    >
                      <v-icon>{{
                        sortOrder === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending'
                      }}</v-icon>
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
            </v-container>
          </v-card-title>

          <v-card-text>
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
              <p class="mt-4 text-h6">Loading your tasks...</p>
            </div>

            <!-- Tasks Table -->
            <div v-else-if="filteredAndSortedTasks.length > 0">
              <v-data-table
                :headers="[
                  { title: 'Title', key: 'title', sortable: false, width: '26%' },
                  { title: 'Category', key: 'category', sortable: false, width: '12%' },
                  { title: 'Priority', key: 'priority', sortable: false, width: '12%' },
                  { title: 'Start Date', key: 'startDate', sortable: false, width: '12%' },
                  { title: 'Due Date', key: 'dueDate', sortable: false, width: '12%' },
                  { title: 'Weighted', key: 'weighted', sortable: false, width: '10%' },
                  { title: 'Submitted', key: 'submitted', sortable: false, width: '8%' },
                  { title: 'Actions', key: 'action', sortable: false, width: '8%' },
                ]"
                :items="filteredAndSortedTasks"
                class="tasks-table"
                hide-default-footer
                :items-per-page="-1"
              >
                <!-- Showing all tasks in the table -->
                <!-- Title Column -->
                <template #item.title="{ item }">
                  <div class="d-flex align-center">
                    <div>
                      <div class="font-weight-medium task-title">{{ item.title }}</div>
                      <div v-if="item.description" class="text-caption text-grey">
                        {{
                          item.description.length > 50
                            ? item.description.substring(0, 50) + '...'
                            : item.description
                        }}
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Category Column -->
                <template #item.category="{ item }">
                  <v-chip size="small" variant="outlined">{{ item.category }}</v-chip>
                </template>

                <!-- Priority Column -->
                <template #item.priority="{ item }">
                  <v-chip :color="getPriorityColor(item.priority)" size="small">
                    {{ item.priority }}
                  </v-chip>
                </template>

                <!-- Start Date Column -->
                <template #item.startDate="{ item }">
                  <div class="text-body-2">{{ formatDate(item.startDate) }}</div>
                </template>

                <!-- Due Date Column -->
                <template #item.dueDate="{ item }">
                  <div
                    class="text-body-2"
                    :class="{
                      'text-error': new Date(item.dueDate) < new Date() && !item.submitted,
                    }"
                  >
                    {{ formatDate(item.dueDate) }}
                  </div>
                </template>

                <!-- Weight Column -->
                <template #item.weighted="{ item }">
                  <div class="text-body-2 text-center">{{ item.weighted }}</div>
                </template>

                <!-- Submitted Column -->
                <template #item.submitted="{ item }">
                  <div class="text-center">
                    <v-icon :color="item.submitted ? 'success' : 'error'" size="20">
                      {{ item.submitted ? 'mdi-check' : 'mdi-close' }}
                    </v-icon>
                  </div>
                </template>

                <!-- Actions Column -->
                <template #item.action="{ item }">
                  <div class="text-center">
                    <v-btn
                      @click="navigateToTeam(item)"
                      color="primary"
                      variant="outlined"
                      size="small"
                      :data-team-id="item.teamId"
                      :aria-label="`Open team details for ${item.title}`"
                    >
                      <v-icon start>mdi-open-in-new</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>

              <!-- Results Summary -->
              <div class="mt-4 text-center">
                <v-chip color="primary" variant="outlined">
                  Showing {{ filteredAndSortedTasks.length }} of {{ tasks.length }} tasks
                </v-chip>
              </div>
            </div>

            <!-- No Tasks State -->
            <div v-else-if="tasks.length === 0" class="text-center py-8">
              <v-icon size="64" class="mb-4" color="grey">mdi-table-off</v-icon>
              <h3 class="text-h5 mb-2">No Tasks Found</h3>
              <p class="text-grey mb-4">
                You don't have any tasks assigned yet. Tasks will appear here when they're assigned
                to you.
              </p>
              <v-btn color="primary" @click="router.push('/teams')" size="large">
                <v-icon start>mdi-account-group</v-icon>
                View Teams
              </v-btn>
            </div>

            <!-- No Filtered Results -->
            <div v-else class="text-center py-8">
              <v-icon size="64" class="mb-4" color="grey">mdi-filter-off</v-icon>
              <h3 class="text-h5 mb-2">No Tasks Match Filters</h3>
              <p class="text-grey mb-4">Try adjusting your filters to see more tasks.</p>
              <v-btn color="primary" @click="clearFilters" variant="outlined">
                <v-icon start>mdi-close</v-icon>
                Clear Filters
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.tasks-table {
  width: 100%;
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

.task-detail-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.task-detail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 112, 243, 0.3);
}

/* Data table customization */
:deep(.v-data-table) {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

:deep(.v-data-table .v-data-table__th) {
  font-weight: 600;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
  padding: 16px !important;
  background-color: #F9FAFB;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

:deep(.v-data-table .v-data-table__td) {
  padding: 16px !important;
  vertical-align: middle;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

:deep(.v-data-table tbody tr) {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.v-data-table tbody tr:hover) {
  background-color: rgba(0, 112, 243, 0.04) !important;
}

:deep(.v-data-table tbody tr:last-child td) {
  border-bottom: none;
}

:deep(.v-data-table table) {
  table-layout: fixed;
  width: 100%;
  min-width: 1050px; /* Ensure table maintains minimum width */
}

/* Text overrides for overdue dates */
.text-error {
  color: rgb(var(--v-theme-error)) !important;
  font-weight: 500;
}

/* Filter and sort controls */
.gap-2 > * + * {
  margin-left: 8px;
}

/* Mobile responsive controls */
@media (max-width: 960px) {
  .gap-2 {
    flex-wrap: wrap;
    gap: 8px !important;
  }

  .gap-2 > * + * {
    margin-left: 0;
  }

  .justify-end {
    justify-content: flex-start !important;
  }
}

/* Ensure proper spacing in title column */
.d-flex.align-center {
  align-items: center;
}
</style>
