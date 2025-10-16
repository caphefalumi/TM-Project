<template>
  <v-container fluid class="roadmap-container pa-0">
    <v-row no-gutters class="roadmap-header">
      <v-col cols="12" md="6">
        <v-btn-toggle
          v-if="!($vuetify.display.xs && !showTimelineOnly)"
          v-model="currentView"
          mandatory
          variant="outlined"
          size="small"
        >
          <v-btn value="week" size="small">
            <span class="d-md-inline">Week</span>
          </v-btn>
          <v-btn value="month" size="small">
            <span class="d-md-inline">Month</span>
          </v-btn>
        </v-btn-toggle>
        <v-btn
          v-if="$vuetify.display.xs && showTimelineOnly"
          icon
          size="small"
          class="float-workflow-2"
          @click="toggleWorkflowDisplay"
          color="white"
        >
          <v-icon>mdi-chart-gantt</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-row no-gutters class="roadmap-content flex-nowrap">
      <!-- Left: Task list -->
      <v-col
        cols="12"
        sm="4"
        md="4"
        lg="3"
        class="task-list-container d-flex flex-column"
        v-if="!($vuetify.display.xs && showTimelineOnly)"
      >
        <v-sheet class="task-list-header pa-4" color="grey-lighten-5" height="60px">
          <div class="d-flex align-center justify-space-between">
            <h3 class="text-subtitle1 font-weight-bold text-grey-darken-2">TASKS</h3>
            <v-btn
              v-if="$vuetify.display.xs"
              icon
              size="small"
              class="float-workflow"
              @click="toggleWorkflowDisplay"
              color="white"
            >
              <v-icon>mdi-chart-gantt</v-icon>
            </v-btn>
          </div>
        </v-sheet>

        <v-list class="task-list" ref="taskList" @scroll="onTaskListScroll">
          <template v-if="tasks && tasks.length > 0">
            <div class="task-spacer" :style="{ height: topSpacerHeight + 'px' }"></div>
            <v-list-item
              v-for="(task, idx) in visibleTasks"
              :key="task.id"
              class="task-item"
              :class="[{ highlighted: highlightedTaskId === task.id }, `status-${task.status}`]"
              :style="{ height: rowHeight + 'px' }"
              @click="focusOnTask(task.id, visibleRange.start + idx)"
            >
              <template v-slot:prepend>
                <v-avatar size="8" :color="getStatusColor(task.status)"></v-avatar>
              </template>

              <v-list-item-title class="task-name text-body-1">
                {{ task.name }}
              </v-list-item-title>

              <v-list-item-subtitle class="task-priority-label text-body-2">
                {{ task.priority.toUpperCase() }} • {{ task.status }}
              </v-list-item-subtitle>
            </v-list-item>
            <div class="task-spacer" :style="{ height: bottomSpacerHeight + 'px' }"></div>
          </template>
          <template v-else>
            <v-list-item class="task-item">
              <v-list-item-title class="task-name text-body-1">
                No tasks available.
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-col>

      <!-- Right: Timeline -->
      <v-col
        cols="12"
        sm="8"
        md="8"
        lg="9"
        class="timeline-container d-flex flex-column"
        :class="{ 'pa-0': $vuetify.display.xs }"
      >
        <v-sheet
          class="timeline-header"
          color="grey-lighten-5"
          height="60px"
          v-if="(showTimelineOnly && $vuetify.display.xs) || !$vuetify.display.xs"
        >
          <div class="timeline-header-content" ref="timelineHeaderContent">
            <div
              v-for="date in dates"
              :key="date.iso"
              class="timeline-day"
              :class="{
                'month-start': date.monthStart,
                today: date.isToday,
              }"
              :style="{ minWidth: dayWidth + 'px', width: dayWidth + 'px' }"
            >
              <template v-if="currentView === 'month'">
                <div class="month-name">{{ date.monthName }} {{ date.year }}</div>
              </template>
              <template v-else>
                <div v-if="date.monthStart" class="month-label">
                  {{ date.monthName }} {{ date.year }}
                </div>
                <div class="day-number">{{ date.day }}</div>
              </template>
            </div>
          </div>
        </v-sheet>

        <div class="timeline-content flex-grow-1" ref="timelineContent" @scroll="onTimelineScroll">
          <div class="timeline-grid" :style="timelineGridStyle">
            <div class="grid-overlay">
              <div
                v-for="(d, i) in dates"
                :key="'grid-' + i"
                :class="['grid-line-vertical', { 'month-start': d.monthStart }]"
                :style="{ left: i * dayWidth + 'px' }"
              ></div>
            </div>

            <div class="timeline-spacer" :style="{ height: topSpacerHeight + 'px' }"></div>

            <div
              v-for="(task, idx) in visibleTasks"
              :key="task.id"
              class="timeline-row"
              :class="{ highlighted: highlightedTaskId === task.id }"
              :style="{ height: rowHeight + 'px' }"
            >
              <div class="task-bar-container">
                <div
                  class="task-bar"
                  :class="task.status"
                  :data-task-id="task.id"
                  :style="getTaskBarStyle(task)"
                  @click.stop="showTaskModal(task.id)"
                  @mouseenter="showTooltip($event, task)"
                  @mouseleave="hideTooltip"
                  @mousemove="updateTooltipPosition($event)"
                >
                  <span class="d-none d-sm-inline">{{ task.name }}</span>
                  <span class="d-sm-none">{{ task.name.substring(0, 100) }}</span>
                </div>
              </div>
            </div>

            <div class="timeline-spacer" :style="{ height: bottomSpacerHeight + 'px' }"></div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Tooltip -->
    <div v-if="tooltip.show" class="custom-tooltip show" :style="tooltip.style">
      <div class="tooltip-content">
        <div class="tooltip-title">{{ tooltip.title }}</div>
        <div class="tooltip-detail">Assigned: {{ tooltip.assigned }}</div>
        <div class="tooltip-detail" v-if="tooltip.completion">
          Progress: {{ tooltip.completion }}
        </div>
      </div>
    </div>

    <!-- Responsive Modal -->
    <v-dialog
      v-model="modal.show"
      :max-width="$vuetify.display.xs ? '95%' : '800'"
      :fullscreen="$vuetify.display.xs"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon v-if="$vuetify.display.xs" class="mr-3" @click="closeModal">
            mdi-arrow-left
          </v-icon>
          <div class="text-h6 text-truncate">{{ modal.task?.name }}</div>
          <v-spacer></v-spacer>
          <v-btn v-if="!$vuetify.display.xs" icon @click="closeModal">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <!-- Description -->
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="text-subtitle2 font-weight-bold mb-2">Description</div>
              <div class="text-body-2 text-grey-darken-1">
                {{ modal.task?.description || 'No description provided' }}
              </div>
            </v-col>
          </v-row>

          <!-- Priority, Status, Category, Weight -->
          <v-row class="mb-4">
            <v-col cols="6" sm="3">
              <div class="text-subtitle2 font-weight-bold mb-1">Priority</div>
              <v-chip
                :color="getPriorityColor(modal.task?.priority || 'medium')"
                size="small"
                variant="flat"
              >
                {{ modal.task?.priority?.toUpperCase() }}
              </v-chip>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-subtitle2 font-weight-bold mb-1">Status</div>
              <v-chip
                :color="getStatusColor(modal.task?.status || 'not-started')"
                size="small"
                variant="flat"
              >
                {{ modal.task?.status?.replace('-', ' ').toUpperCase() }}
              </v-chip>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-subtitle2 font-weight-bold mb-1">Category</div>
              <div class="text-body-2">{{ modal.task?.category || 'N/A' }}</div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-subtitle2 font-weight-bold mb-1">Total Weight</div>
              <div class="text-body-2">{{ modal.task?.weighted || 0 }}</div>
            </v-col>
          </v-row>

          <!-- Dates -->
          <v-row class="mb-4">
            <v-col cols="6" sm="3">
              <div class="text-subtitle2 font-weight-bold mb-1">Start Date</div>
              <div class="text-body-2">{{ formatDate(modal.task?.startDate) }}</div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-subtitle2 font-weight-bold mb-1">Due Date</div>
              <div class="text-body-2">{{ formatDate(modal.task?.dueDate) }}</div>
            </v-col>
            <v-col cols="12" sm="6" class="d-flex-column align-center">
              <div class="text-subtitle2 font-weight-bold mb-1">Completion Rate</div>
              <div class="d-flex align-center w-100">
                <v-progress-linear
                  :model-value="modal.task?.completionRate || 0"
                  height="16px"
                  rounded
                  :color="getProgressColor(modal.task?.completionRate || 0)"
                  class="mr-2 flex-grow-1"
                >
                </v-progress-linear>
                <span class="text-body-2 ml-2">{{ modal.task?.completionRate || 0 }}%</span>
              </div>
            </v-col>
          </v-row>

          <!-- Assigned Members -->
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle2 font-weight-bold mb-2">Assigned Members</div>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="member in modal.task?.assignedMembers"
                  :key="member"
                  size="small"
                  color="primary"
                  variant="outlined"
                >
                  {{ member }}
                </v-chip>
                <v-chip
                  v-if="!modal.task?.assignedMembers || modal.task.assignedMembers.length === 0"
                  size="small"
                  color="grey"
                  variant="outlined"
                >
                  No members assigned
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider v-if="!$vuetify.display.xs"></v-divider>

        <v-card-actions v-if="!$vuetify.display.xs" class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="outlined" color="primary" @click="closeModal"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import vuetify from '../plugins/vuetify'

export default {
  name: 'WorkflowView',
  props: {
    taskGroups: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      currentView: 'week',
      tasks: [],
      dates: [],
      dayWidth: 60,
      rowHeight: 61,
      highlightedTaskId: null,
      showTimelineOnly: false, // For mobile navigation
      scrollSyncFrame: null, // Animation frame for scroll synchronization
      resizeRaf: null,
      scrollLinking: null,
      renderBuffer: 8,
      visibleRange: { start: 0, end: 0 },
      tooltip: {
        show: false,
        title: '',
        assigned: '',
        completion: '',
        style: {},
      },
      modal: {
        show: false,
        task: null,
      },
      timelineStart: null,
    }
  },
  watch: {
    taskGroups: {
      handler() {
        this.tasks = this.transformTaskGroups()
        this.$nextTick(() => {
          this.updateLayout()
        })
      },
      immediate: true,
      deep: true,
    },
    tasks() {
      this.$nextTick(() => {
        this.updateVisibleRange()
      })
    },
    currentView: {
      handler(newView) {
        this.updateLayout()
      },
    },
  },
  computed: {
    visibleTasks() {
      if (!Array.isArray(this.tasks)) {
        return []
      }

      const { start, end } = this.visibleRange
      return this.tasks.slice(start, end)
    },
    topSpacerHeight() {
      return this.visibleRange.start * this.rowHeight
    },
    bottomSpacerHeight() {
      const total = Array.isArray(this.tasks) ? this.tasks.length : 0
      return Math.max(0, (total - this.visibleRange.end) * this.rowHeight)
    },
    timelineGridStyle() {
      const minWidth = this.dates.length * this.dayWidth
      const lineColor = '#f1f3f4'
      const segmentHeight = `${this.rowHeight}px`

      return {
        minWidth: minWidth + 'px',
        backgroundImage: `linear-gradient(to bottom, transparent ${this.rowHeight - 1}px, ${lineColor} ${this.rowHeight - 1}px)`,
        backgroundSize: `100% ${segmentHeight}`,
        backgroundRepeat: 'repeat-y',
      }
    },
  },
  mounted() {
    // Initial setup - no need to call transformTaskGroups again as watch handles it with immediate: true
    window.addEventListener('resize', this.onWindowResize)

    // Sync header scroll with content initially
    this.$nextTick(() => {
      // Initial scroll to current date after everything is loaded
      setTimeout(() => {
        this.scrollToCurrentDate()
        this.updateVisibleRange()
      }, 100)
    })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onWindowResize)

    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf)
    }

    // Clean up animation frame
    if (this.scrollSyncFrame) {
      cancelAnimationFrame(this.scrollSyncFrame)
    }
  },
  methods: {
    onWindowResize() {
      if (this.resizeRaf) {
        cancelAnimationFrame(this.resizeRaf)
      }

      this.resizeRaf = requestAnimationFrame(() => {
        this.updateLayout()
      })
    },
    syncTimelineHeader() {
      if (this.scrollSyncFrame) {
        cancelAnimationFrame(this.scrollSyncFrame)
      }

      this.scrollSyncFrame = requestAnimationFrame(() => {
        const header = this.$refs.timelineHeaderContent
        const content = this.$refs.timelineContent
        if (header && content) {
          header.style.transform = `translateX(-${content.scrollLeft}px)`
        }
      })
    },
    syncScrollPositions(source, scrollTop) {
      if (!Array.isArray(this.tasks) || this.tasks.length === 0) {
        this.visibleRange = { start: 0, end: 0 }
        return
      }

      const otherRef = source === 'timeline' ? 'taskList' : 'timelineContent'
      const other = this.$refs[otherRef]

      if (other && Math.abs(other.scrollTop - scrollTop) > 1) {
        this.scrollLinking = otherRef
        other.scrollTop = scrollTop
      }

      this.updateVisibleRangeFromScroll(scrollTop)
    },
    onTaskListScroll(e) {
      if (this.scrollLinking === 'taskList') {
        this.scrollLinking = null
        return
      }

      this.syncScrollPositions('taskList', e.target.scrollTop)
    },
    switchView(view) {
      this.currentView = view
      this.updateLayout()
    },
    getPriorityColor(priority) {
      switch (priority.toLowerCase()) {
        case 'high':
          return 'error'
        case 'medium':
          return 'warning'
        case 'low':
          return 'info'
        default:
          return 'grey'
      }
    },
    getStatusColor(status) {
      switch (status.toLowerCase()) {
        case 'completed':
          return 'success'
        case 'pending':
          return 'warning'
        case 'overdue':
          return 'error'
        case 'not-started':
          return 'grey'
        default:
          return 'grey'
      }
    },
    getProgressColor(progress) {
      if (progress >= 80) return 'success'
      if (progress >= 50) return 'warning'
      if (progress >= 20) return 'info'
      return 'error'
    },
    transformTaskGroups() {
      if (!this.taskGroups || this.taskGroups.length === 0) {
        return []
      }

      try {
        const transformedTasks = this.taskGroups
          .map((taskGroup) => {
            // Validate required fields
            if (!taskGroup.taskGroupId || !taskGroup.title) {
              console.warn('Invalid taskGroup:', taskGroup)
              return null
            }

            // Determine status based on completion rate and due date
            let status = 'not-started'
            const dueDate = new Date(Date.parse(taskGroup.dueDate))
            const startDate = new Date(Date.parse(taskGroup.startDate))

            // Validate dates
            if (isNaN(dueDate.getTime()) || isNaN(startDate.getTime())) {
              console.warn('Invalid dates in taskGroup:', taskGroup)
              return null
            }

            const completionRate = parseFloat(taskGroup.completionRate || '0')

            const now = new Date()
            if (completionRate === 100) {
              status = 'completed'
            } else if (startDate < now && now < dueDate) {
              status = 'pending'
            } else {
              status = now < startDate ? 'not-started' : 'overdue'
            }
            // Map priority to lowercase for consistency
            const priority = taskGroup.priority ? taskGroup.priority.toLowerCase() : 'medium'
            return {
              id: taskGroup.taskGroupId,
              name: taskGroup.title,
              description: taskGroup.description || '',
              category: taskGroup.category || '',
              priority: priority,
              status: status,
              startDate: startDate,
              dueDate: dueDate,
              assignedMembers: taskGroup.assignedMember || [],
              weighted: taskGroup.totalWeight || 0,
              completedTasks: taskGroup.completedTasks || 0,
              completionRate: parseFloat(taskGroup.completionRate || '0.0').toFixed(1),
            }
          })
          .filter((task) => task !== null) // Remove invalid tasks

        return this.sortTasks(transformedTasks)
      } catch (error) {
        console.log('Error transforming task groups:', error)
      }
    },
    sortTasks(tasks) {
      return tasks.sort((a, b) => a.startDate - b.startDate)
    },
    updateLayout() {
      this.dayWidth = this.getDayWidth()
      this.rowHeight = this.getRowHeight()
      const computed = this.generateTimelineDates()
      this.dates = computed.dates
      this.timelineStart = computed.startDate

      // Auto-scroll to current date after layout update
      this.$nextTick(() => {
        this.scrollToCurrentDate()
        this.updateVisibleRange()
        this.syncTimelineHeader()
      })
    },
    updateVisibleRangeFromScroll(scrollTop) {
      const total = Array.isArray(this.tasks) ? this.tasks.length : 0
      if (total === 0) {
        this.visibleRange = { start: 0, end: 0 }
        return
      }

      const container = this.$refs.timelineContent
      const viewportHeight = container ? container.clientHeight : window.innerHeight
      const buffer = this.renderBuffer
      const start = Math.max(0, Math.floor(scrollTop / this.rowHeight) - buffer)
      const end = Math.min(total, Math.ceil((scrollTop + viewportHeight) / this.rowHeight) + buffer)

      if (start !== this.visibleRange.start || end !== this.visibleRange.end) {
        this.visibleRange = { start, end }
      }
    },
    updateVisibleRange() {
      const container = this.$refs.timelineContent
      const scrollTop = container ? container.scrollTop : 0
      this.updateVisibleRangeFromScroll(scrollTop)
    },
    generateTimelineDates() {
      if (!this.tasks.length) return { dates: [], startDate: new Date() }

      // When in 'week' view we show individual days between padded start/end
      if (this.currentView === 'week') {
        const taskStartDates = this.tasks.map((t) => t.startDate.getTime()).filter((d) => !isNaN(d))
        const taskEndDates = this.tasks.map((t) => t.dueDate.getTime()).filter((d) => !isNaN(d))

        // Center around current date
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to midnight for accurate date comparison

        let minDate, maxDate
        if (taskStartDates.length === 0 || taskEndDates.length === 0) {
          // No tasks, show timeline centered around today
          minDate = new Date(today)
          maxDate = new Date(today)
        } else {
          const minTaskDate = new Date(Math.min(...taskStartDates))
          const maxTaskDate = new Date(Math.max(...taskEndDates))

          // Expand range to include current date
          minDate = new Date(Math.min(today.getTime(), minTaskDate.getTime()))
          maxDate = new Date(Math.max(today.getTime(), maxTaskDate.getTime()))
        }

        // Add padding in days
        const padBefore = 14
        const padAfter = 14

        const start = new Date(minDate)
        start.setDate(start.getDate() - padBefore)
        const end = new Date(maxDate)
        end.setDate(end.getDate() + padAfter)

        const dates = []
        const cursor = new Date(start)

        // Calculate actual span and set realistic safety limit
        const actualDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000))
        const maxDays = Math.max(1200, actualDays + 100) // Allow for actual span plus buffer
        let dayCount = 0

        while (cursor <= end && dayCount < maxDays) {
          const currentDate = new Date(cursor)
          const isToday =
            currentDate.getFullYear() === today.getFullYear() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getDate() === today.getDate()

          const localDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

          dates.push({
            iso: localDateString,
            day: cursor.getDate(),
            dayName: cursor.toLocaleString(undefined, { weekday: 'short' }).toUpperCase(),
            monthName: cursor.toLocaleString('en-US', { month: 'short' }),
            monthStart: cursor.getDate() === 1,
            year: cursor.getFullYear(),
            isToday: isToday,
          })
          cursor.setDate(cursor.getDate() + 1)
          dayCount++
        }

        // Warn if generating very large timeline
        if (dates.length > 2000) {
          console.warn(
            `WorkflowView: Generated ${dates.length} days for timeline. Consider using month view for better performance.`,
          )
        }

        return { dates, startDate: start }
      }

      // MONTH VIEW: create one column per month between padded start/end
      const taskStartDates = this.tasks.map((t) => t.startDate.getTime()).filter((d) => !isNaN(d))
      const taskEndDates = this.tasks.map((t) => t.dueDate.getTime()).filter((d) => !isNaN(d))

      // Center around current date
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let minDate, maxDate
      if (taskStartDates.length === 0 || taskEndDates.length === 0) {
        // No tasks, show timeline centered around today
        minDate = new Date(today)
        maxDate = new Date(today)
      } else {
        const minTaskDate = new Date(Math.min(...taskStartDates))
        const maxTaskDate = new Date(Math.max(...taskEndDates))

        // Expand range to include current date
        minDate = new Date(Math.min(today.getTime(), minTaskDate.getTime()))
        maxDate = new Date(Math.max(today.getTime(), maxTaskDate.getTime()))
      }

      // Pad in months
      const padBeforeMonths = 1 // show previous month
      const padAfterMonths = 1 // show next month

      const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
      start.setMonth(start.getMonth() - padBeforeMonths)

      const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
      end.setMonth(end.getMonth() + padAfterMonths)

      const dates = []
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1)

      // Calculate actual months span and set realistic safety limit
      const actualMonths =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
      const maxMonths = Math.max(120, actualMonths + 12) // Allow for actual span plus buffer
      let monthCount = 0

      while (cursor <= end && monthCount < maxMonths) {
        const year = cursor.getFullYear()
        const month = cursor.getMonth()
        const monthName = cursor.toLocaleString('en-US', { month: 'short' })
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const isToday = year === today.getFullYear() && month === today.getMonth()

        dates.push({
          iso: `${year}-${String(month + 1).padStart(2, '0')}`,
          monthIndex: month,
          monthName,
          monthStart: true,
          year,
          daysInMonth,
          isToday: isToday,
        })
        cursor.setMonth(cursor.getMonth() + 1)
        monthCount++
      }

      return { dates, startDate: start }
    },

    toggleWorkflowDisplay() {
      this.showTimelineOnly = !this.showTimelineOnly
    },
    getDayWidth() {
      // Use Vuetify breakpoints for responsive design
      if (this.$vuetify?.display) {
        const { xs, sm, md } = this.$vuetify.display

        if (this.currentView === 'week') {
          if (xs || sm) return 45
          return 55 // lg and xl
        }

        // month view - use wider columns sized to represent an entire month
        if (xs || sm) return 80
        return 120 // lg and xl
      }

      // Fallback to window width if Vuetify not available
      const screenWidth = window.innerWidth
      if (this.currentView === 'week') {
        return screenWidth < 600 ? 40 : screenWidth < 960 ? 50 : 60
      }
      return screenWidth < 600 ? 100 : screenWidth < 960 ? 120 : 160
    },
    getRowHeight() {
      if (this.$vuetify?.display) {
        const { xs, sm } = this.$vuetify.display
        if (xs) return 52
        if (sm) return 58
      }

      return 61
    },
    dateDiffDays(a, b) {
      const ms = 24 * 60 * 60 * 1000
      return Math.round((b - a) / ms)
    },
    getTaskBarStyle(task) {
      if (!this.timelineStart || !this.dates.length) return {}

      if (this.currentView === 'week') {
        const startOffset = this.dateDiffDays(this.timelineStart, task.startDate)
        const duration = Math.max(1, this.dateDiffDays(task.startDate, task.dueDate) + 1)
        const left = startOffset * this.dayWidth
        const width = duration * this.dayWidth - 8
        return {
          left: left + 'px',
          width: width + 'px',
        }
      }

      // month view - calculate offsets/duration in months
      const monthDiff = (a, b) =>
        (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())

      const timelineMonthStart = new Date(
        this.timelineStart.getFullYear(),
        this.timelineStart.getMonth(),
        1,
      )
      const taskStartMonth = new Date(task.startDate.getFullYear(), task.startDate.getMonth(), 1)
      const taskEndMonth = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), 1)

      const offsetMonths = monthDiff(timelineMonthStart, taskStartMonth)
      // include partial months by rounding up end difference +1 to be inclusive
      const durationMonths = Math.max(1, monthDiff(taskStartMonth, taskEndMonth) + 1)

      const left = offsetMonths * this.dayWidth
      const width = durationMonths * this.dayWidth - 12

      return {
        left: left + 'px',
        width: width + 'px',
      }
    },
    focusOnTask(taskId, taskIndex) {
      if (this.$vuetify.display.xs) {
        this.showTimelineOnly = true
      }
      this.highlightedTaskId = taskId
      const timelineContent = this.$refs.timelineContent
      this.$nextTick(() => {
        if (!timelineContent) return

        const task = this.tasks[taskIndex]
        if (!task) return

        const bar = this.$el.querySelector(`.task-bar[data-task-id=\"${taskId}\"]`)
        const barStyle = this.getTaskBarStyle(task)
        const containerWidth = timelineContent.clientWidth

        const numericLeft = parseFloat(barStyle.left) || (bar ? bar.offsetLeft : 0)
        const numericWidth = parseFloat(barStyle.width) || (bar ? bar.offsetWidth : 0)

        // For long tasks, focus on the start date (left edge) with some padding
        // For shorter tasks, center them in the view
        let targetScrollLeft
        const padding = 100 // pixels of padding from the left edge

        if (numericWidth > containerWidth * 0.6) {
          // Long task: scroll to show the start date with padding
          targetScrollLeft = Math.max(0, numericLeft - padding)
        } else {
          // Short task: center it in the view
          targetScrollLeft = numericLeft + numericWidth / 2 - containerWidth / 2
        }

        const targetScrollTop =
          taskIndex * this.rowHeight - timelineContent.clientHeight / 2 + this.rowHeight / 2
        timelineContent.scrollTo({
          left: Math.max(0, targetScrollLeft),
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        })

        const applyPulse = (el) => {
          if (!el) return
          el.classList.add('pulse')
          setTimeout(() => el.classList.remove('pulse'), 2000)
        }

        if (bar) {
          applyPulse(bar)
        } else {
          // Wait for virtualization to render the element
          setTimeout(() => {
            const freshBar = this.$el.querySelector(`.task-bar[data-task-id=\"${taskId}\"]`)
            applyPulse(freshBar)
          }, 100)
        }
      })
    },
    scrollToCurrentDate() {
      if (!this.dates.length || !this.timelineStart) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const timelineContent = this.$refs.timelineContent
      if (!timelineContent) return

      if (this.currentView === 'week') {
        // Find the index of today's date in the dates array
        const todayLocalString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const todayIndex = this.dates.findIndex((date) => date.iso === todayLocalString)

        if (todayIndex !== -1) {
          // Calculate scroll position to center on today
          const containerWidth = timelineContent.clientWidth
          const targetScrollLeft =
            todayIndex * this.dayWidth - containerWidth / 2 + this.dayWidth / 2

          timelineContent.scrollTo({
            left: Math.max(0, targetScrollLeft),
            top: 0,
            behavior: 'smooth',
          })
        }
      } else {
        // Month view - find the month containing today
        const todayYear = today.getFullYear()
        const todayMonth = today.getMonth()

        const monthIndex = this.dates.findIndex(
          (date) => date.year === todayYear && date.monthIndex === todayMonth,
        )

        if (monthIndex !== -1) {
          // Calculate scroll position to center on today's month
          const containerWidth = timelineContent.clientWidth
          const targetScrollLeft =
            monthIndex * this.dayWidth - containerWidth / 2 + this.dayWidth / 2

          timelineContent.scrollTo({
            left: Math.max(0, targetScrollLeft),
            top: 0,
            behavior: 'smooth',
          })
        }
      }
    },
    onTimelineScroll(e) {
      this.syncTimelineHeader()

      if (this.scrollLinking === 'timelineContent') {
        this.scrollLinking = null
        return
      }

      this.syncScrollPositions('timeline', e.target.scrollTop)
    },
    showTaskModal(taskId) {
      const t = this.tasks.find((x) => x.id === taskId)
      if (!t) return
      this.modal.task = t
      this.modal.show = true
    },
    closeModal() {
      this.modal.show = false
      this.modal.task = null
    },
    showTooltip(event, task) {
      const assignedMembers =
        task.assignedMembers && task.assignedMembers.length > 0
          ? task.assignedMembers.join(', ')
          : 'No members assigned'

      this.tooltip = {
        show: true,
        title: task.name,
        assigned: assignedMembers,
        completion: `${task.completionRate}%`,
        style: {
          left: event.clientX + 15 + 'px',
          top: event.clientY - 10 + 'px',
          transform: 'translateY(-100%)',
        },
      }
    },
    hideTooltip() {
      this.tooltip.show = false
    },
    updateTooltipPosition(event) {
      if (!this.tooltip.show) return

      this.tooltip.style = {
        left: event.clientX + 15 + 'px',
        top: event.clientY - 10 + 'px',
        transform: 'translateY(-100%)',
      }
    },
    formatDate(date) {
      if (!date) return 'Not set'
      const d = new Date(date)
      if (isNaN(d.getTime())) return 'Invalid date'
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },
    parseDate(dateString) {
      if (!dateString) return new Date()

      // Handle various date formats and fix 2-digit year issues
      let date = new Date(dateString)

      // Check if the year is less than 100 (which means it was interpreted as 19xx)
      // and the original string contains a 2-digit year that should be 20xx
      if (date.getFullYear() < 1950) {
        // Try to parse the date string and fix 2-digit years
        const dateStr = String(dateString)

        // Look for patterns like "Jan 31, 21" or similar 2-digit years
        const twoDigitYearMatch = dateStr.match(/(\w+\s+\d{1,2},?\s+)(\d{2})$/)
        if (twoDigitYearMatch) {
          const yearPart = parseInt(twoDigitYearMatch[2])
          // Assume years 00-30 are 2000-2030, years 31-99 are 1931-1999
          const fullYear = yearPart <= 30 ? 2000 + yearPart : 1900 + yearPart
          const newDateStr = twoDigitYearMatch[1] + fullYear
          date = new Date(newDateStr)
        }

        // Also handle formats like "21-01-31" or "21/01/31"
        const shortYearMatch = dateStr.match(/^(\d{2})[-\/](\d{1,2})[-\/](\d{1,2})$/)
        if (shortYearMatch) {
          const year = parseInt(shortYearMatch[1])
          const month = parseInt(shortYearMatch[2]) - 1 // Month is 0-based
          const day = parseInt(shortYearMatch[3])
          const fullYear = year <= 30 ? 2000 + year : 1900 + year
          date = new Date(fullYear, month, day)
        }
      }

      return date
    },
  },
}
</script>

<style scoped>
/* Responsive roadmap component with Vuetify integration */
.roadmap-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 100%;
  min-height: 500px;
}

.roadmap-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.view-label {
  color: #666;
  font-weight: 500;
  font-size: 14px;
}

.roadmap-content {
  height: calc(100vh - 200px);
  min-height: 400px;
}

/* Task List Responsive Styles */
.task-list-container {
  background: white;
  border-right: 1px solid #e0e0e0;
  min-height: 100%;
}

.task-list {
  overflow-y: auto;
  margin-top: 0;
  padding-top: 0;
}

.task-spacer {
  width: 100%;
  pointer-events: none;
  flex-shrink: 0;
}

.task-item {
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
  margin-top: 0;
}

/* Status-based styling for left pane task items */
.task-item.status-not-started {
  background-color: rgba(158, 158, 158, 0.1); /* Gray background */
  border-left: 4px solid #9e9e9e; /* Gray border */
}

.task-item.status-pending {
  background-color: rgba(255, 152, 0, 0.1); /* Orange background */
  border-left: 4px solid #ff9800; /* Orange border */
}

.task-item.status-overdue {
  background-color: rgba(244, 67, 54, 0.1); /* Red background */
  border-left: 4px solid #f44336; /* Red border */
}

.task-item.status-completed {
  background-color: rgba(76, 175, 80, 0.1); /* Green background */
  border-left: 4px solid #4caf50; /* Green border */
}

.task-item:hover {
  background-color: rgba(0, 0, 0, 0.05) !important;
}

.task-item.highlighted {
  background-color: rgba(25, 118, 210, 0.15) !important;
  border-left-color: #1976d2 !important;
}

.task-item:hover {
  background-color: #f5f5f5;
}

.task-item.highlighted {
  background-color: #e3f2fd;
  border-left-color: #1976d2;
}

.task-name {
  font-weight: 500;
  line-height: 1.4;
  font-size: 16px;
}

.task-priority-label {
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 13px;
}

.float-workflow {
  position: relative;
  bottom: 5px;
  right: 0px;
  border: 1px solid black;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.float-workflow-2 {
  position: absolute;
  border: 1px solid black;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  right: 12px;
  z-index: 1000;
}

/* Timeline Responsive Styles */
.timeline-container {
  background: white;
  /* overflow: hidden; */
  position: relative;
}

.timeline-mobile-header {
  border-bottom: 1px solid #e0e0e0;
}

.timeline-header {
  border-bottom: 1px solid #e0e0e0;
  overflow-x: hidden;
  position: relative;
}

.timeline-header::after {
  content: '';
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, #1976d2 0%, transparent 20%, transparent 80%, #1976d2 100%);
  opacity: 0.3;
}

.timeline-header-content {
  display: flex;
  width: fit-content;
}

.timeline-day {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  position: relative;
  padding: 4px 0px 12.4px 0px;
  border-radius: 2px;
}

.timeline-day:last-child {
  border-right: none;
}

.timeline-day.month-start {
  border-left: 2.3px solid #1976d2;
  position: relative;
}

.timeline-day.today {
  background-color: rgba(25, 118, 210, 0.1);
  border: 2px solid #1976d2;
  box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);
  position: relative;
}

.timeline-day.today::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  pointer-events: none;
}

.timeline-day.today .day-number {
  color: #1976d2;
  font-weight: 700;
}

.month-label {
  position: absolute;
  top: 1px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: #1976d2;
  white-space: nowrap;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  padding: 2px 4px;
  border-radius: 3px;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  margin-top: 15px;
}

.day-name {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.7;
}

.month-name {
  font-size: 12px;
  font-weight: 600;
  margin-top: 15px;
}

.timeline-content {
  overflow: auto;
  position: relative;
  scroll-behavior: smooth;
}

/* Add scroll hint animation for mobile */
.timeline-content::before {
  content: '↔';
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
  animation: scrollHint 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes scrollHint {
  0%,
  70%,
  100% {
    opacity: 0;
    transform: translateY(-50%) translateX(0);
  }
  10%,
  60% {
    opacity: 1;
    transform: translateY(-50%) translateX(-5px);
  }
  35% {
    transform: translateY(-50%) translateX(5px);
  }
}

/* Hide scroll hint on larger screens */
@media (min-width: 768px) {
  .timeline-content::before {
    display: none;
  }
}

.timeline-grid {
  position: relative;
  min-width: fit-content;
}

.timeline-spacer {
  width: 100%;
  pointer-events: none;
  flex-shrink: 0;
}

.timeline-row {
  display: flex;
  height: 61px;
  border-bottom: 1px solid #f1f3f4;
  align-items: center;
  position: relative;
}

.timeline-row:last-child {
  border-bottom: none;
}

.timeline-row.highlighted {
  background-color: rgba(25, 118, 210, 0.05);
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.grid-line-vertical {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background-color: #f1f3f4;
}

.grid-line-vertical.month-start {
  background-color: #e0e0e0;
  width: 2px;
}

.grid-line-horizontal {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #f1f3f4;
  pointer-events: none;
}

.task-bar-container {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
  z-index: 2;
}

.task-bar {
  height: 24px;
  border-radius: 12px;
  position: absolute;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.05s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  overflow: hidden;
}

.task-bar:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.task-bar.not-started {
  background-color: #9ca3af;
}

.task-bar.pending {
  background-color: #f59e0b;
}

.task-bar.overdue {
  background-color: #ef4444;
}

.task-bar.completed {
  background-color: #10b981;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(25, 118, 210, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
}

.task-bar.pulse {
  animation: pulse 2s ease-out;
}

.custom-tooltip {
  position: fixed;
  background: rgba(33, 33, 33, 0.95);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 300px;
}

.custom-tooltip.show {
  opacity: 1;
}

.tooltip-content .tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.tooltip-content .tooltip-detail {
  margin: 2px 0;
  font-size: 12px;
  opacity: 0.9;
}

/* Mobile Responsive Adjustments */
@media (max-width: 599px) {
  .roadmap-header {
    padding: 12px 16px;
  }

  .timeline-day {
    padding: 12px 2px 6px 2px;
    font-size: 11px;
  }

  .day-number {
    font-size: 12px;
  }

  .task-bar {
    height: 20px;
    padding: 0 6px;
    font-size: 10px;
  }

  .timeline-row {
    height: 50px;
  }
}

/* Tablet Responsive Adjustments */
@media (min-width: 600px) and (max-width: 959px) {
  .roadmap-header {
    padding: 16px 20px;
  }
}

/* Custom scrollbar styling */
.timeline-content::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.timeline-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.timeline-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.timeline-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.timeline-content::-webkit-scrollbar-corner {
  background: #f1f1f1;
}

/* Hide vertical scrollbar for task list but keep horizontal visible for timeline */
.task-list::-webkit-scrollbar {
  width: 8px;
}

.task-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.task-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Firefox scrollbar styling */
.timeline-content,
.task-list {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}
</style>
