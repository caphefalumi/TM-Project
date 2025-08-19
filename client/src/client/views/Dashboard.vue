<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AuthStore from '../scripts/authStore.js'
import { VCalendar } from 'vuetify/labs/VCalendar'

const { getUserByAccessToken } = AuthStore

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const tasks = ref([])
const loading = ref(false)
const selectedDate = ref(new Date())
const selectedDates = ref([new Date()]) // Array for VCalendar v-model
const calendarType = ref('month') // 'month', 'week', 'day'

// Watch for selectedDate changes
watch(
  selectedDate,
  (newDate, oldDate) => {
    console.log('Selected date changed from', oldDate, 'to', newDate)
    // Update the selectedDates array for VCalendar
    selectedDates.value = [newDate]
  },
  { deep: true },
)

// Watch for selectedDates changes (from VCalendar)
watch(
  selectedDates,
  (newDates, oldDates) => {
    if (newDates && newDates.length > 0) {
      // Update selectedDate when VCalendar selection changes
      selectedDate.value = newDates[0]
    }
  },
  { deep: true },
)

onMounted(async () => {
  // Initialize selected date to today
  selectedDate.value = new Date()
  selectedDates.value = [new Date()] // Initialize array for VCalendar
  console.log('Dashboard mounted, selected date:', selectedDate.value)

  const userToken = await getUserByAccessToken()
  if (userToken) {
    setUserToUserToken(userToken)
    await fetchTasks()
  } else {
    console.log('No user token found, redirecting to login')
    router.push('/login')
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

// Format tasks for calendar display
const calendarTasks = computed(() => {
  // Helper function to format date in local timezone as YYYY-MM-DD
  const formatLocalDate = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return tasks.value.map((task) => ({
    ...task,
    date: formatLocalDate(new Date(task.dueDate)), // Use local date formatting instead of ISO
    color: getTaskColor(task),
    icon: getTaskIcon(task),
    isOverdue: !task.submitted && new Date(task.dueDate) < new Date(),
  }))
})

// Group tasks by date for easier calendar rendering
const tasksByDate = computed(() => {
  const grouped = {}
  calendarTasks.value.forEach((task) => {
    if (!grouped[task.date]) {
      grouped[task.date] = []
    }
    grouped[task.date].push(task)
  })
  return grouped
})

// Get tasks for a specific date
const getTasksForDate = (date) => {
  let dateStr

  // Helper function to format date in local timezone as YYYY-MM-DD
  const formatLocalDate = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Handle different date formats from VCalendar
  if (typeof date === 'string') {
    dateStr = date
  } else if (date instanceof Date) {
    dateStr = formatLocalDate(date) // Use local date formatting instead of ISO
  } else if (date && typeof date === 'object' && date.date) {
    // VCalendar sometimes passes { date: "YYYY-MM-DD" }
    dateStr = typeof date.date === 'string' ? date.date : formatLocalDate(new Date(date.date))
  } else {
    // Fallback: try to convert to Date first
    dateStr = formatLocalDate(new Date(date))
  }

  console.log('getTasksForDate called with:', date)
  console.log('Converted to dateStr:', dateStr)
  console.log('Available task dates:', Object.keys(tasksByDate.value))
  console.log('Tasks for this date:', tasksByDate.value[dateStr] || [])

  return tasksByDate.value[dateStr] || []
}

// Calendar events for VCalendar
const calendarEvents = computed(() => {
  return tasks.value.map((task) => ({
    title: task.submitted ? `✓ ${task.title}` : task.title,
    start: new Date(task.dueDate),
    end: new Date(task.dueDate),
    color: getTaskColor(task),
    task: task,
    allDay: true,
  }))
})

// Task statistics
const taskStats = computed(() => {
  const total = tasks.value.length
  const submitted = tasks.value.filter((task) => task.submitted).length
  const overdue = tasks.value.filter(
    (task) => !task.submitted && new Date(task.dueDate) < new Date(),
  ).length
  const pending = total - submitted - overdue

  return {
    total,
    submitted,
    overdue,
    pending,
    completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
  }
})

const fetchTasks = async () => {
  loading.value = true
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const response = await fetch(`${PORT}/api/tasks/${user.value.userId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const result = await response.json()
    if (!response.ok) {
      console.log('Failed to fetch tasks:', response.message)
      throw new Error('Failed to fetch tasks')
    } else {
      console.log('Tasks fetched successfully:', result.tasks)
      tasks.value = result.tasks || []
    }
  } catch (error) {
    console.error('Error fetching tasks:', error)
  } finally {
    loading.value = false
  }
}

// Navigate to team when task is clicked
const navigateToTeam = (task) => {
  console.log('Navigating to team for task:', task)
  if (task && task.teamId) {
    console.log('Navigating to team ID:', task.teamId)
    router.push(`/teams/${task.teamId}`)
  } else {
    console.error('Task or teamId is missing:', task)
  }
}

// Format date for display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Handle calendar event click
const onEventClick = (event) => {
  console.log('Event clicked:', event)
  if (event && event.task) {
    navigateToTeam(event.task)
  }
}

// Handle date click on calendar day
const onDateClick = (event) => {
  console.log('Date click event:', event)

  // Try to extract date from the clicked element
  const target = event.target
  console.log('Clicked target:', target)
  console.log('Target textContent:', target.textContent)

  const dateText = target.textContent
  if (dateText && !isNaN(dateText) && dateText.length <= 2) {
    const currentMonth = selectedDate.value.getMonth()
    const currentYear = selectedDate.value.getFullYear()
    const clickedDate = new Date(currentYear, currentMonth, parseInt(dateText))

    console.log('Current selected date:', selectedDate.value)
    console.log('Extracted day number:', parseInt(dateText))
    console.log('Constructed clicked date:', clickedDate)
    console.log('Clicked date string:', clickedDate.toDateString())
    console.log('Clicked date ISO string:', clickedDate.toISOString().split('T')[0])

    selectedDate.value = clickedDate

    // Force a check of tasks for this date
    console.log('Tasks for clicked date:', getTasksForDate(clickedDate))
    return
  }

  console.log('Could not extract date from click event')
}

// Handle date change (when selectedDates is updated via v-model)
const onDateChange = (newDates) => {
  console.log('Date changed via v-model to:', newDates)
  // Update selectedDate when VCalendar v-model changes
  if (newDates && newDates.length > 0) {
    selectedDate.value = new Date(newDates[0])
  }
}
const onCalendarChange = (interval) => {
  console.log('Calendar interval changed:', interval)
  // Force reactivity update by triggering a re-render
  // The calendar should automatically update, but we can add logic here if needed
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <v-row class="align-center mb-6">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold">Hi, {{ user.username }}!</h1>
        <p class="text-h6 text-grey">Here's your task overview and calendar</p>
      </v-col>
      <v-col cols="12" md="4" class="text-right">
        <v-btn
          @click="fetchTasks"
          :loading="loading"
          color="primary"
          size="large"
          variant="outlined"
        >
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <!-- Task Statistics Cards -->
    <v-row class="mb-6">
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="primary" variant="tonal">
          <v-card-title class="text-h3 font-weight-bold">{{ taskStats.total }}</v-card-title>
          <v-card-subtitle class="text-h6">Total Tasks</v-card-subtitle>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="success" variant="tonal">
          <v-card-title class="text-h3 font-weight-bold">{{ taskStats.submitted }}</v-card-title>
          <v-card-subtitle class="text-h6">Completed</v-card-subtitle>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="text-center pa-4" color="warning" variant="tonal">
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
              <span class="text-caption"
                >{{ taskStats.submitted }} of {{ taskStats.total }} tasks</span
              >
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
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-calendar</v-icon>
              Task Calendar
            </div>
          </v-card-title>

          <v-card-text>
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
              <p class="mt-4 text-h6">Loading your tasks...</p>
            </div>

            <!-- Calendar Component -->
            <div v-else class="calendar-container">
              <v-calendar
                v-model="selectedDates"
                :view-mode="calendarType"
                :events="calendarEvents"
                @click:event="onEventClick"
                @click="onDateClick"
                @update:model-value="onDateChange"
                @change="onCalendarChange"
                color="blue-darken-2"
                class="custom-vcalendar"
              >
                <!-- Custom event slot -->
                <template #event="{ event }">
                  <div class="calendar-event-wrapper">
                    <v-chip
                      :color="event.color"
                      size="small"
                      :class="[
                        'task-calendar-chip',
                        { 'completed-task-chip': event.task.submitted },
                      ]"
                      @click.stop="onEventClick(event)"
                    >
                      <v-icon start size="12">{{ getTaskIcon(event.task) }}</v-icon>
                      {{
                        event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title
                      }}
                    </v-chip>
                  </div>
                </template>
              </v-calendar>
            </div>

            <!-- Legend -->
            <div class="mt-4">
              <v-divider class="mb-3"></v-divider>
              <div class="d-flex flex-wrap gap-4">
                <div class="d-flex align-center">
                  <v-chip color="success" size="small" class="mr-2">
                    <v-icon start>mdi-check-circle</v-icon>
                    Completed
                  </v-chip>
                </div>
                <div class="d-flex align-center">
                  <v-chip color="red-darken-2" size="small" class="mr-2">
                    <v-icon start>mdi-alert-circle</v-icon>
                    Urgent
                  </v-chip>
                </div>
                <div class="d-flex align-center">
                  <v-chip color="orange-darken-1" size="small" class="mr-2">
                    <v-icon start>mdi-clock-outline</v-icon>
                    High
                  </v-chip>
                </div>
                <div class="d-flex align-center">
                  <v-chip color="green-darken-1" size="small" class="mr-2">
                    <v-icon start>mdi-clock-outline</v-icon>
                    Medium
                  </v-chip>
                </div>
                <div class="d-flex align-center">
                  <v-chip color="blue-darken-1" size="small" class="mr-2">
                    <v-icon start>mdi-clock-outline</v-icon>
                    Low
                  </v-chip>
                </div>
                <div class="d-flex align-center">
                  <v-chip color="grey-darken-3" size="small" class="mr-2">
                    <v-icon start>mdi-clock-outline</v-icon>
                    Optional
                  </v-chip>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Debug Information (temporary) -->
    <v-row v-if="tasks.length > 0" class="mt-2">
      <v-col cols="12">
        <v-card variant="outlined" color="info" class="pa-2">
          <v-card-text>
            <small>
              <strong>Debug Info:</strong>
              Total tasks: {{ tasks.length }} | Selected date:
              {{ selectedDate ? formatDate(selectedDate) : 'None' }} | Selected date ISO:
              {{ selectedDate ? selectedDate.toISOString().split('T')[0] : 'None' }} | Tasks for
              selected date: {{ selectedDate ? getTasksForDate(selectedDate).length : 0 }}
              <br />
              <strong>Available task dates:</strong> {{ Object.keys(tasksByDate).join(', ') }}
            </small>
            <!-- Test buttons -->
            <div class="mt-2">
              <v-btn size="x-small" color="primary" @click="selectedDate = new Date()" class="mr-2">
                Set to Today
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Selected Date Tasks (if any) -->
    <v-row v-if="selectedDate && getTasksForDate(selectedDate).length > 0" class="mt-6">
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
            Tasks for {{ formatDate(selectedDate) }}
            <v-spacer></v-spacer>
            <v-chip color="primary" variant="outlined" size="small">
              {{ getTasksForDate(selectedDate).length }} task{{
                getTasksForDate(selectedDate).length !== 1 ? 's' : ''
              }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="task in getTasksForDate(selectedDate)"
                :key="task._id"
                cols="12"
                md="6"
                lg="4"
              >
                <v-card
                  class="task-detail-card"
                  variant="outlined"
                  @click="navigateToTeam(task)"
                  :ripple="true"
                >
                  <v-card-item>
                    <v-card-title class="d-flex align-center">
                      <v-icon :color="getTaskColor(task)" class="mr-2">
                        {{ getTaskIcon(task) }}
                      </v-icon>
                      <span class="text-truncate">{{ task.title }}</span>
                      <v-spacer></v-spacer>
                      <v-chip :color="getTaskColor(task)" size="small">
                        {{ task.priority }}
                      </v-chip>
                    </v-card-title>
                    <v-card-subtitle>
                      {{ task.category }} • Due: {{ new Date(task.dueDate).toLocaleDateString() }}
                    </v-card-subtitle>
                  </v-card-item>
                  <v-card-text v-if="task.description">
                    <p class="text-body-2">{{ task.description }}</p>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn
                      :color="getTaskColor(task)"
                      variant="outlined"
                      size="small"
                      @click.stop="navigateToTeam(task)"
                    >
                      <v-icon start>mdi-open-in-new</v-icon>
                      Open Team
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-chip
                      :color="task.submitted ? 'success' : 'warning'"
                      size="small"
                      variant="flat"
                    >
                      {{ task.submitted ? 'Submitted' : 'Pending' }}
                    </v-chip>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Tasks State -->
    <v-row v-if="!loading && tasks.length === 0" class="mt-6">
      <v-col cols="12">
        <v-card class="text-center pa-8" variant="outlined">
          <v-icon size="64" class="mb-4" color="grey">mdi-calendar-blank</v-icon>
          <h3 class="text-h5 mb-2">No Tasks Found</h3>
          <p class="text-grey mb-4">
            You don't have any tasks assigned yet. Tasks will appear here when they're assigned to
            you.
          </p>
          <v-btn color="primary" @click="router.push('/teams')" size="large">
            <v-icon start>mdi-account-group</v-icon>
            View Teams
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.custom-vcalendar {
  width: 100%;
  min-height: 600px;
}

.day-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100px;
  padding: 4px;
}

.tasks-in-day {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-chip {
  font-size: 10px !important;
  height: 18px !important;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 100%;
}

.task-chip:hover {
  transform: scale(1.05);
  opacity: 0.8;
}

.task-calendar-chip {
  font-size: 11px !important;
  height: 24px !important;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 1px;
  max-width: 100%;
}

.task-calendar-chip:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

/* Completed task styling - bright green background with black text */

.completed-task-chip .v-icon {
  color: #000000 !important; /* Black icon */
}

.calendar-event-wrapper {
  width: 100%;
  padding: 1px;
}

.task-detail-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
}

.task-detail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.calendar-container {
  max-width: 100%;
  overflow-x: auto;
}

/* Custom Vuetify VCalendar styling */
:deep(.v-calendar) {
  border-radius: 8px;
}

:deep(.v-calendar .v-btn) {
  margin: 2px;
}

:deep(.v-calendar-daily) {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-calendar-weekly) {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-calendar-monthly) {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-calendar-daily .v-calendar-daily__day) {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-calendar-weekly .v-calendar-weekly__day) {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-calendar-monthly .v-calendar-monthly__day) {
  border: 1px solid rgba(0, 0, 0, 0.06);
  min-height: 120px;
}

:deep(.v-calendar-monthly .v-calendar-monthly__day:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

:deep(.v-calendar .v-calendar-daily__day-label),
:deep(.v-calendar .v-calendar-weekly__day-label),
:deep(.v-calendar .v-calendar-monthly__day-label) {
  font-weight: 500;
}

/* Today highlighting */
:deep(.v-calendar .v-calendar-daily__day.v-calendar-daily__day--today),
:deep(.v-calendar .v-calendar-weekly__day.v-calendar-weekly__day--today),
:deep(.v-calendar .v-calendar-monthly__day.v-calendar-monthly__day--today) {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* Event styling */
:deep(.v-calendar .v-calendar-event) {
  margin: 1px;
  border-radius: 4px;
}
</style>
