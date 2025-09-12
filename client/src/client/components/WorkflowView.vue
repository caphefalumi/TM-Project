<template>
  <div class="workflow-view">
    <div class="workflow-container">
      <!-- Left: Task List -->
      <div class="workflow-tasks-list">
        <div class="workflow-tasks-header">Tasks</div>
        <div class="workflow-tasks-items">
          <div
            v-for="task in sortedTasks"
            :key="task._id"
            class="workflow-task-item"
            :class="{ selected: selectedTask && selectedTask._id === task._id }"
            @click="openTaskDialog(task)"
          >
            <span class="workflow-task-color" :style="{ background: getStatusColor(task) }"></span>
            <span class="workflow-task-title">{{ task.title }}</span>
          </div>
        </div>
      </div>
      <!-- Right: Timeline -->
      <div class="workflow-timeline-wrapper">
        <div class="workflow-timeline-scroll" ref="timelineScroll">
          <div class="workflow-timeline-months">
            <div
              v-for="(month, idx) in months"
              :key="month.key"
              class="workflow-timeline-month"
              :style="{ left: month.left + 'px' }"
              v-once
            >
              {{ month.label }}
            </div>
          </div>
          <div class="workflow-timeline-days">
            <div
              v-for="day in timelineDays"
              :key="day.key"
              class="workflow-timeline-day"
              :style="{ left: day.left + 'px' }"
              v-once
            >
              {{ day.label }}
            </div>
          </div>
          <div class="workflow-timeline-tasks">
            <div
              v-for="task in sortedTasks"
              :key="task._id"
              class="workflow-timeline-task"
              :style="getTaskTimelineStyleWithLog(task)"
              :title="task.title"
              @mouseenter="showTaskTooltipWithLog(task, $event)"
              @mouseleave="hideTaskTooltipWithLog"
              @click="openTaskDialogWithLog(task)"
            >
              <span :style="{ background: getStatusColorWithLog(task) }" class="workflow-timeline-task-bar"></span>
            </div>
          </div>
        </div>
        <!-- Tooltip -->
        <div v-if="tooltip.visible" class="workflow-tooltip" :style="tooltip.style">
          <div><strong>{{ tooltip.task?.title }}</strong></div>
          <div>Assigned: {{ tooltip.task?.assignedUsers?.length || 0 }}</div>
          <div>Completion: {{ getCompletionRate(tooltip.task) }}</div>
        </div>
      </div>
    </div>
    <!-- Task Dialog -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ViewTask from './ViewTask.vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  teamId: { type: String, default: '' },
})

const dialog = ref(false)
const selectedTask = ref(null)
const tooltip = ref({ visible: false, style: {}, task: null })
const timelineScroll = ref(null)

const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => {
    const aStart = new Date(a.startDate)
    const bStart = new Date(b.startDate)
    if (aStart.getTime() !== bStart.getTime()) return aStart - bStart
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
})

// Timeline calculations
const DAY_WIDTH = 32
const TIMELINE_PADDING = 64
const today = new Date()

const minDate = computed(() => {
  if (!sortedTasks.value.length) return today
  return new Date(Math.min(...sortedTasks.value.map(t => new Date(t.startDate))))
})
const maxDate = computed(() => {
  if (!sortedTasks.value.length) return today
  return new Date(Math.max(...sortedTasks.value.map(t => new Date(t.dueDate))))
})

const timelineDays = computed(() => {
  const days = []
  let d = new Date(minDate.value)
  d.setHours(0,0,0,0)
  const end = new Date(maxDate.value)
  end.setHours(0,0,0,0)
  let idx = 0
  while (d <= end) {
    days.push({
      key: d.toISOString(),
      label: d.getDate(),
      left: idx * DAY_WIDTH + TIMELINE_PADDING,
      date: new Date(d),
    })
    d.setDate(d.getDate() + 1)
    idx++
  }
  return days
})

const months = computed(() => {
  const out = []
  let lastMonth = null
  timelineDays.value.forEach((day, idx) => {
    const m = day.date.getMonth()
    if (m !== lastMonth) {
      out.push({
        key: `${day.date.getFullYear()}-${m}`,
        label: day.date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        left: day.left,
      })
      lastMonth = m
    }
  })
  return out
})

function getTaskTimelineStyle(task) {
  const start = new Date(task.startDate)
  const end = new Date(task.dueDate)
  const startIdx = Math.max(0, Math.floor((start - minDate.value) / (1000*60*60*24)))
  const endIdx = Math.max(0, Math.floor((end - minDate.value) / (1000*60*60*24)))
  return {
    left: (startIdx * DAY_WIDTH + TIMELINE_PADDING) + 'px',
    width: ((endIdx - startIdx + 1) * DAY_WIDTH) + 'px',
  }
}

function getTaskTimelineStyleWithLog(task) {
  console.log('getTaskTimelineStyle', task)
  return getTaskTimelineStyle(task)
}

function getStatusColor(task) {
  // Not Started – Gray, Pending – Orange, Overdue – Red, Completed – Green
  const now = new Date()
  if (task.submitted) return 'green'
  if (new Date(task.startDate) > now) return 'gray'
  if (new Date(task.dueDate) < now) return 'red'
  return 'orange'
}

function getStatusColorWithLog(task) {
  console.log('getStatusColor', task)
  return getStatusColor(task)
}

function getCompletionRate(task) {
  if (!task.assignedUsers || !task.assignedUsers.length) return '0.00%'
  const submitted = task.submissions ? task.submissions.length : 0
  return ((submitted / task.assignedUsers.length) * 100).toFixed(2) + '%'
}

function showTaskTooltip(task, evt) {
  tooltip.value = {
    visible: true,
    style: {
      top: evt.clientY + 12 + 'px',
      left: evt.clientX + 12 + 'px',
    },
    task,
  }
}

function showTaskTooltipWithLog(task, evt) {
  console.log('showTaskTooltip', task)
  showTaskTooltip(task, evt)
}

function hideTaskTooltip() {
  tooltip.value.visible = false
}

function hideTaskTooltipWithLog() {
  console.log('hideTaskTooltip')
  hideTaskTooltip()
}

function openTaskDialog(task) {
  selectedTask.value = task
  dialog.value = true
}

function openTaskDialogWithLog(task) {
  console.log('openTaskDialog', task)
  openTaskDialog(task)
}
</script>
<style>
@import '../../../node_modules/@syncfusion/ej2-base/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-buttons/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-calendars/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-dropdowns/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-inputs/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-lists/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-layouts/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-navigations/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-popups/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-splitbuttons/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-grids/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-treegrid/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-gantt/styles/material.css';
@import '../../../node_modules/@syncfusion/ej2-vue-gantt/styles/material.css';
</style>
