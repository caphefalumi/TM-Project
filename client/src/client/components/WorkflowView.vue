<template>
  <div class="workflow-container">
    <div class="workflow-header">
      <h2 class="text-h5 mb-4">Project Roadmap</h2>
      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <span class="zoom-label">View:</span>
        <div class="zoom-buttons">
          <button
            class="zoom-btn"
            :class="{ 'zoom-btn--active': zoomLevel === 'week' }"
            @click="setZoomLevel('week')"
            title="Week View"
          >
            <i class="mdi mdi-calendar-week"></i>
            Week
          </button>
          <button
            class="zoom-btn"
            :class="{ 'zoom-btn--active': zoomLevel === 'month' }"
            @click="setZoomLevel('month')"
            title="Month View"
          >
            <i class="mdi mdi-calendar-month"></i>
            Month
          </button>
        </div>
      </div>
    </div>

    <!-- No Tasks Message -->
    <div v-if="!hasTasksToDisplay" class="no-tasks-message">
      <div class="no-tasks-content">
        <i
          class="mdi mdi-calendar-blank"
          style="font-size: 64px; color: #9ca3af; margin-bottom: 16px"
        ></i>
        <h3 class="text-h6 mb-2" style="color: #6b7280">No Tasks Available</h3>
        <p style="color: #9ca3af">Tasks will appear here once they are created for this team.</p>
      </div>
    </div>

    <div v-else class="gantt-container">
      <!-- Left Sidebar - Task List -->
      <div class="task-sidebar">
        <div class="sidebar-header">
          <h3>Tasks</h3>
        </div>
        <RecycleScroller
          class="task-list"
          :items="sortedTasks"
          :item-size="64"
          key-field="_id"
          v-slot="{ item: task }"
        >
          <div
            class="task-item"
            :class="{ 'task-item--active': selectedTask && selectedTask._id === task._id }"
            @click="openTaskModal(task)"
          >
            <span class="task-title">{{ task.title }}</span>
            <div class="task-meta">
              <span
                class="task-status"
                :style="{ backgroundColor: getStatusColor(task.status) }"
              ></span>
              <span class="task-priority">{{ task.priority }}</span>
            </div>
          </div>
        </RecycleScroller>
      </div>
      <!-- Right Timeline Area -->
      <div class="timeline-area" :class="`timeline-area--${zoomLevel}`">
        <div class="timeline-header" :class="`timeline-header--${zoomLevel}`">
          <div
            v-for="(date, index) in visibleDates"
            :key="index"
            class="timeline-date"
            :class="{
              'timeline-date--month-start': date.isMonthStart,
              'timeline-date--week-start': date.isWeekStart,
              'timeline-date--today': date.isToday,
              'timeline-date--day': date.isDayView,
              'timeline-date--month': date.isMonth,
            }"
          >
            <div v-if="date.isMonthStart" class="month-label">
              {{ date.monthLabel }}
            </div>
            <div class="day-label">{{ date.day }}</div>
          </div>
        </div>
        <RecycleScroller
          class="timeline-content"
          :items="sortedTasks"
          :item-size="48"
          key-field="_id"
          v-slot="{ item: task }"
        >
          <div class="timeline-row">
            <div
              class="task-bar"
              :style="getTaskBarStyle(task)"
              @click="openTaskModal(task)"
              @mouseenter="showTooltip($event, task)"
              @mouseleave="hideTooltip"
            >
              <span class="task-bar-label">{{ task.title }}</span>
            </div>
          </div>
        </RecycleScroller>

        <div
          class="current-day-line"
          :style="getCurrentDayLineStyle()"
          v-if="isCurrentDayVisible"
        ></div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-title">{{ tooltip.task?.title }}</div>
      <div class="tooltip-info">Assigned: {{ tooltip.task?.assignedMembers?.length || 0 }}</div>
      <div class="tooltip-info">Completion: {{ getCompletionRate(tooltip.task) }}%</div>
    </div>
    <!-- ViewTask Component -->
    <ViewTask
      v-if="selectedTask"
      :dialog="showModal"
      :task="selectedTask"
      :team-id="props.teamId || selectedTask.teamId || 'default'"
      :username="'current-user'"
      @update:dialog="closeModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import ViewTask from './ViewTask.vue'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// Props
const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  teamId: {
    type: String,
    default: '',
  },
  teamMembers: {
    type: Array,
    default: () => [],
  },
  taskGroups: {
    type: Array,
    default: () => [],
  },
})

// Calendar limits (2015-2035)
const MIN_YEAR = 2015
const MAX_YEAR = 2035

// Use props.tasks if provided, otherwise use default
const tasksData = computed(() => {
  // If we have tasks from props, use them; otherwise fall back to default tasks
  const tasks = props.tasks && props.tasks.length > 0 ? props.tasks : []

  // Filter out any invalid tasks (tasks without required fields)
  return tasks.filter((task) => task && task._id && task.title && task.startDate && task.dueDate)
})

// Zoom level state
const zoomLevel = ref('week') // 'week', 'month'

// Reactive data - calculate timeline start based on tasks
const timelineStart = computed(() => getTimelineStart())
const visibleDays = computed(() => {
  // Calculate days from timeline start to end of MAX_YEAR
  const start = new Date(timelineStart.value)
  const end = new Date(MAX_YEAR, 11, 31) // December 31, MAX_YEAR
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
})
const selectedTask = ref(null)
const showModal = ref(false)
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  task: null,
})

// Status colors
const statusColors = {
  'Not Started': '#bdbdbd',
  Pending: '#ff9800',
  Overdue: '#e53935',
  Completed: '#43a047',
}

// Computed properties
const sortedTasks = computed(() => {
  return [...tasksData.value].sort((a, b) => {
    const dateA = new Date(a.startDate)
    const dateB = new Date(b.startDate)
    if (dateA.getTime() === dateB.getTime()) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return dateA.getTime() - dateB.getTime()
  })
})

const visibleDates = computed(() => {
  const dates = []
  const start = new Date(timelineStart.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (zoomLevel.value === 'week') {
    // Week view - show individual days
    for (let i = 0; i < visibleDays.value; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)

      const isMonthStart = date.getDate() === 1
      const isWeekStart = date.getDay() === 1 // Monday
      const isToday = date.getTime() === today.getTime()

      dates.push({
        date,
        day: date.getDate(),
        isMonthStart,
        isWeekStart,
        isToday,
        monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        weekLabel: `Week ${getWeekNumber(date)}`,
        isDayView: true,
      })
    }
  } else {
    // Month view - show months starting from the actual timeline start date
    const startYear = start.getFullYear()
    const startMonth = start.getMonth()

    // Start from the timeline start month/year, not January
    for (let year = startYear; year <= MAX_YEAR; year++) {
      const monthStart = year === startYear ? startMonth : 0
      const monthEnd = year === MAX_YEAR ? 11 : 11 // Always go to December unless it's the max year

      for (let month = monthStart; month <= monthEnd; month++) {
        const date = new Date(year, month, 1)
        const isToday = today.getFullYear() === year && today.getMonth() === month

        dates.push({
          date,
          day: date.toLocaleDateString('en-US', { month: 'short' }),
          isMonthStart: true,
          isToday,
          monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          isMonth: true,
        })
      }
    }
  }

  return dates
})

const isCurrentDayVisible = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(timelineStart.value)
  const end = new Date(start)
  end.setDate(start.getDate() + visibleDays.value)

  return today >= start && today < end
})

// Methods
const getWeekNumber = (date) => {
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000)
}

const getStatusColor = (status) => {
  return statusColors[status] || '#bdbdbd'
}

const getCompletionRate = (task) => {
  if (!task || !task.assignedMembers || task.assignedMembers.length === 0) {
    return 0
  }
  const rate = ((task.submissions?.length || 0) / task.assignedMembers.length) * 100
  return Math.round(rate * 100) / 100 // Round to 2 decimal places
}

const getTimelineStart = () => {
  // Get the tasks data from tasksData computed property
  const tasks = tasksData.value

  // Get the earliest start date from tasks, within calendar limits
  if (tasks && tasks.length > 0) {
    const earliestTask = tasks.reduce((earliest, task) => {
      const taskDate = new Date(task.startDate)
      const earliestDate = new Date(earliest.startDate)
      return taskDate < earliestDate ? task : earliest
    })

    const startDate = new Date(earliestTask.startDate)

    // Ensure date is within limits (2015-2077)
    if (startDate.getFullYear() < MIN_YEAR) {
      return new Date(MIN_YEAR, 0, 1)
    }
    if (startDate.getFullYear() > MAX_YEAR) {
      return new Date(MAX_YEAR, 0, 1)
    }

    // Start timeline a few days before the earliest task
    startDate.setDate(startDate.getDate() - 5)
    return startDate
  }

  // Default to current date if no tasks, but within limits
  const today = new Date()
  if (today.getFullYear() < MIN_YEAR) {
    return new Date(MIN_YEAR, 0, 1)
  }
  if (today.getFullYear() > MAX_YEAR) {
    return new Date(MAX_YEAR, 0, 1)
  }

  return today
}

const getTaskBarStyle = (task) => {
  const start = new Date(timelineStart.value)
  const taskStart = new Date(task.startDate)
  const taskEnd = new Date(task.dueDate)

  let unitWidth, startOffset, duration

  if (zoomLevel.value === 'week') {
    // Week view - each unit is a day
    unitWidth = 40
    const startDays = Math.max(0, (taskStart - start) / (1000 * 60 * 60 * 24))
    const durationDays = Math.max(1, (taskEnd - taskStart) / (1000 * 60 * 60 * 24) + 1)

    startOffset = startDays
    duration = durationDays
  } else {
    // Month view - each unit is a month
    unitWidth = 80
    const startMonth = taskStart.getFullYear() * 12 + taskStart.getMonth()
    const endMonth = taskEnd.getFullYear() * 12 + taskEnd.getMonth()
    const timelineStartMonth = start.getFullYear() * 12 + start.getMonth()

    startOffset = Math.max(0, startMonth - timelineStartMonth)
    duration = Math.max(1, endMonth - startMonth + 1)
  }

  return {
    left: startOffset * unitWidth + 'px',
    width: duration * unitWidth - 2 + 'px',
    backgroundColor: getStatusColor(task.status),
  }
}

const getCurrentDayLineStyle = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(timelineStart.value)
  let unitWidth, offset

  if (zoomLevel.value === 'week') {
    unitWidth = 40
    offset = (today - start) / (1000 * 60 * 60 * 24)
  } else {
    unitWidth = 80
    const currentMonth = today.getFullYear() * 12 + today.getMonth()
    const timelineStartMonth = start.getFullYear() * 12 + start.getMonth()
    offset = Math.max(0, currentMonth - timelineStartMonth)
  }

  return {
    left: offset * unitWidth + 'px',
  }
}

const setZoomLevel = (level) => {
  zoomLevel.value = level
}

const showTooltip = (event, task) => {
  tooltip.value = {
    visible: true,
    x: event.clientX + 10,
    y: event.clientY - 10,
    task,
  }
}

const hideTooltip = () => {
  tooltip.value.visible = false
}

const openTaskModal = (task) => {
  selectedTask.value = task
  showModal.value = true
}

const closeModal = () => {
  selectedTask.value = null
  showModal.value = false
}

// Check if we have any tasks to display
const hasTasksToDisplay = computed(() => tasksData.value.length > 0)

// Handle keyboard events
const handleKeydown = (event) => {
  if (event.key === 'Escape' && showModal.value) {
    closeModal()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.workflow-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  background: #f6f8fa;
  height: 80vh;
  color: #24292f;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #d1d9e0;
}

.workflow-header {
  padding: 20px;
  background: #ffffff;
  border-bottom: 1px solid #d1d9e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-label {
  font-size: 14px;
  font-weight: 500;
  color: #656d76;
}

.zoom-buttons {
  display: flex;
  gap: 4px;
}

.zoom-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f6f8fa;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  color: #24292f;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: #e1e4e8;
  border-color: #c6cbd1;
}

.zoom-btn--active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.zoom-btn i {
  font-size: 16px;
}

.gantt-container {
  display: flex;
  height: calc(80vh - 80px);
  max-height: calc(80vh - 80px);
  overflow: hidden;
}

.task-sidebar {
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  background: #ffffff;
  border-right: 1px solid #d1d9e0;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #d1d9e0;
  background: #f6f8fa;
}

.sidebar-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #656d76;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-list {
  flex: 1;
  overflow-y: auto;
}

.task-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f6f8fa;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 64px;
  box-sizing: border-box;
}

.task-item:hover {
  background: #f6f8fa;
}

.task-item--active {
  background: #dbeafe;
  border-left: 3px solid #2563eb;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: #24292f;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.task-priority {
  font-size: 12px;
  color: #656d76;
  text-transform: uppercase;
  font-weight: 500;
}

.timeline-area {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  background: #ffffff;
  position: relative;
  background-image:
    linear-gradient(to right, #e1e4e8 1px, transparent 1px),
    linear-gradient(to bottom, #f6f8fa 1px, transparent 1px);
  background-size: 40px 48px;
  background-position: 0 0;
}

.timeline-area--week {
  background-size: 40px 48px;
}

.timeline-area--month {
  background-size: 80px 48px;
}

.timeline-header {
  display: flex;
  border-bottom: 1px solid #d1d9e0;
  background: #f6f8fa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.timeline-date {
  padding: 8px 4px;
  text-align: center;
  border-right: 1px solid #e1e4e8;
  position: relative;
  flex-shrink: 0;
  min-width: 40px;
}

.timeline-date--day {
  min-width: 40px;
}

.timeline-date--month {
  min-width: 80px;
}

.timeline-date--week-start {
  border-left: 2px solid #3b82f6;
}

.timeline-date--today {
  background: #fffbf0;
  border-left: 2px solid #f59e0b;
}

.timeline-date--month-start {
  border-left: 2px solid #6b7280;
}

.month-label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

.day-label {
  font-size: 12px;
  color: #6b7280;
}

.timeline-content {
  flex: 1;
  overflow-y: auto;
}

.timeline-row {
  height: 48px;
  position: relative;
  border-bottom: 1px solid #f6f8fa;
  display: flex;
  align-items: center;
}

.task-bar {
  position: absolute;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 38px;
}

.task-bar:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.task-bar-label {
  color: white;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.current-day-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f59e0b;
  z-index: 5;
  pointer-events: none;
}

.tooltip {
  position: fixed;
  z-index: 1000;
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 200px;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.tooltip-info {
  margin-bottom: 2px;
  opacity: 0.9;
}

.no-tasks-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(80vh - 120px);
  background: #ffffff;
  border-radius: 8px;
  margin: 0 20px 20px 20px;
}

.no-tasks-content {
  text-align: center;
  padding: 40px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .gantt-container {
    flex-direction: column;
    height: auto;
  }

  .task-sidebar {
    width: 100%;
    height: 200px;
    min-width: 100%;
    max-width: 100%;
  }

  .timeline-area {
    height: 400px;
  }

  .workflow-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .zoom-controls {
    align-self: stretch;
    justify-content: center;
  }
}
</style>
