<template>
  <v-card>
    <v-card-title>Activity History</v-card-title>
    <v-divider />
    <v-card-text>
      <v-timeline side="end" density="compact">
        <v-timeline-item
          v-for="activity in activities"
          :key="activity._id"
          :dot-color="getActivityColor(activity.action)"
          size="small"
        >
          <template #icon>
            <v-icon size="small">{{ getActivityIcon(activity.action) }}</v-icon>
          </template>
          <div class="mb-2">
            <div class="text-subtitle-2">
              <strong>{{ activity.username }}</strong> {{ getActivityText(activity) }}
            </div>
            <div class="text-caption text-grey">{{ formatDate(activity.createdAt) }}</div>
          </div>
        </v-timeline-item>
      </v-timeline>
      <div v-if="activities.length === 0" class="text-center text-grey py-4">No activity yet</div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  taskId: {
    type: String,
    required: true,
  },
})

const activities = ref([])

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const getActivityColor = (action) => {
  const colors = {
    created: 'green',
    updated: 'blue',
    status_changed: 'orange',
    comment_added: 'purple',
    assignee_changed: 'indigo',
    priority_changed: 'red',
    dependency_added: 'cyan',
    dependency_removed: 'grey',
    time_logged: 'teal',
    sprint_changed: 'amber',
  }
  return colors[action] || 'grey'
}

const getActivityIcon = (action) => {
  const icons = {
    created: 'mdi-plus-circle',
    updated: 'mdi-pencil',
    status_changed: 'mdi-swap-horizontal',
    comment_added: 'mdi-comment',
    assignee_changed: 'mdi-account-switch',
    priority_changed: 'mdi-flag',
    dependency_added: 'mdi-link-variant-plus',
    dependency_removed: 'mdi-link-variant-remove',
    time_logged: 'mdi-clock-check',
    sprint_changed: 'mdi-calendar',
  }
  return icons[action] || 'mdi-information'
}

const getActivityText = (activity) => {
  if (activity.description) {
    return activity.description.toLowerCase()
  }

  const actionTexts = {
    created: 'created this task',
    updated: `updated ${activity.field || 'the task'}`,
    status_changed: `changed status from ${activity.oldValue} to ${activity.newValue}`,
    comment_added: 'added a comment',
    assignee_changed: `changed assignee from ${activity.oldValue} to ${activity.newValue}`,
    priority_changed: `changed priority from ${activity.oldValue} to ${activity.newValue}`,
    dependency_added: 'added a dependency',
    dependency_removed: 'removed a dependency',
    time_logged: 'logged time',
    sprint_changed: 'changed sprint',
  }
  return actionTexts[activity.action] || 'performed an action'
}

const fetchActivity = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/tasks/${props.taskId}/activity`, {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      activities.value = data.activities
    }
  } catch (error) {
    console.error('Error fetching activity:', error)
  }
}

onMounted(() => {
  fetchActivity()
})
</script>
