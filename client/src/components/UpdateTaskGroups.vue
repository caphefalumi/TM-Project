<script setup>
import { ref, onMounted, computed } from 'vue'
import EnhancedTaskView from './EnhancedTaskView.vue'
import { permissionService } from '../services/permissionService.js'

const emit = defineEmits(['update:dialog', 'task-group-updated'])

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  taskGroupId: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  userProps: {
    type: Object,
    required: true,
  },
  teamMembers: {
    type: Array,
    required: true,
  },
})

// State
const loading = ref(false)
const saving = ref(false)
const success = ref(false)
const error = ref(false)
const message = ref('')
const activeTab = ref('overview')

// ViewTask dialog state
const viewTaskDialog = ref(false)
const selectedTask = ref({})
const selectedUsername = ref('')

// Task group data
const taskGroup = ref({
  tasks: [],
  tasksByUser: {},
  totalUsers: 0,
  completedTasks: 0,
  totalTasks: 0,
  taskGroupId: '',
})

// Edit form data
const editForm = ref({
  title: '',
  description: '',
  priority: '',
  dueDate: '',
  category: '',
  weighted: 0,
  assignedUsers: [], // Array of user IDs
})

// Computed properties
const completionRate = computed(() => {
  if (taskGroup.value.totalTasks === 0) return 0
  return ((taskGroup.value.completedTasks / taskGroup.value.totalTasks) * 100).toFixed(1)
})

const priorityOptions = ['Urgent', 'High', 'Medium', 'Low', 'Optional']
const categoryOptions = ['Development', 'Design', 'Testing', 'Documentation', 'Research', 'Other']

// Computed property for team members as select options
const teamMemberOptions = computed(() => {
  return props.teamMembers.map((member) => ({
    title: member.username,
    value: member.userId,
  }))
})

const getUsernameById = (userId) => {
  const member = props.teamMembers.find((m) => m.userId === userId)
  return member ? member.username : 'Unknown User'
}

// ViewTask methods
const openTaskView = (task) => {
  selectedTask.value = task
  selectedUsername.value = getUsernameById(task.userId)
  viewTaskDialog.value = true
}

// Notification state for permission errors
const noPermissionNotification = ref(false)
let notificationTimeout = null

function showNoPermission() {
  noPermissionNotification.value = true
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => {
    noPermissionNotification.value = false
  }, 3500)
}

function closeNoPermissionNotification() {
  noPermissionNotification.value = false
  if (notificationTimeout) clearTimeout(notificationTimeout)
}

// Methods
const fetchTaskGroupDetails = async () => {
  loading.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/task-groups/${props.taskGroupId}`,
      {
        method: 'GET',
        credentials: 'include',

        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    const result = await response.json()
    if (response.ok) {
      taskGroup.value = result
      // Initialize edit form with current values
      const firstTask = result.tasks[0]
      if (firstTask) {
        // Get all unique user IDs assigned to this task group
        const assignedUserIds = [...new Set(result.tasks.map((task) => task.userId))]

        editForm.value = {
          title: firstTask.title,
          description: firstTask.description || '',
          priority: firstTask.priority,
          dueDate: firstTask.dueDate ? new Date(firstTask.dueDate).toISOString().substr(0, 10) : '',
          category: firstTask.category,
          weighted: firstTask.weighted || 0,
          assignedUsers: assignedUserIds,
        }
      }
    } else {
      error.value = true
      message.value = result.message || 'Failed to fetch task group details'
    }
  } catch (err) {
    console.log('Error fetching task group:', err)
    error.value = true
    message.value = 'Failed to fetch task group details'
  } finally {
    loading.value = false
  }
}

const updateTaskGroup = async () => {
  if (
    !editForm.value.title ||
    !editForm.value.priority ||
    !editForm.value.dueDate ||
    !editForm.value.weighted ||
    editForm.value.assignedUsers.length === 0
  ) {
    error.value = true
    message.value = 'Please fill in all required fields and assign at least one user'
    return
  }

  saving.value = true
  error.value = false

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/task-groups/${props.taskGroupId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editForm.value.title,
          description: editForm.value.description,
          priority: editForm.value.priority,
          dueDate: new Date(editForm.value.dueDate),
          category: editForm.value.category,
          weighted: Number(editForm.value.weighted),
          assignedUsers: editForm.value.assignedUsers,
        }),
      },
    )

    const result = await response.json()
    if (response.ok) {
      success.value = true
      message.value = 'Task group updated successfully!'
      emit('task-group-updated')

      // Refresh the data
      await fetchTaskGroupDetails()

      // Soft update the task group in the parent component

      // Clear success message after delay
      setTimeout(() => {
        success.value = false
        message.value = ''
      }, 3000)
    } else {
      error.value = true
      message.value = result.message || 'Failed to update task group'
    }
  } catch (err) {
    console.log('Error updating task group:', err)
    error.value = true
    message.value = 'Failed to update task group'
  } finally {
    saving.value = false
  }
}

const deleteTaskGroup = async () => {
  if (
    !confirm(
      'Are you sure you want to delete this entire task group? This action cannot be undone.',
    )
  ) {
    return
  }

  saving.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/task-groups/${props.taskGroupId}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    const result = await response.json()
    if (response.ok) {
      success.value = true
      message.value = 'Task group deleted successfully!'
      emit('task-group-updated')

      // Close dialog after short delay
      setTimeout(() => {
        emit('update:dialog', false)
      }, 1500)
    } else {
      error.value = true
      message.value = result.message || 'Failed to delete task group'
    }
  } catch (err) {
    console.log('Error deleting task group:', err)
    error.value = true
    message.value = 'Failed to delete task group'
  } finally {
    saving.value = false
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
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

const getSubmissionStatus = (task) => {
  return task.submitted ? 'Submitted' : 'Pending'
}

const getSubmissionColor = (task) => {
  return task.submitted ? 'success' : 'warning'
}

const removeUser = (userId) => {
  editForm.value.assignedUsers = editForm.value.assignedUsers.filter((id) => id !== userId)
}

const handleTaskUpdated = () => {
  // Refresh task group details to show updated task data
  fetchTaskGroupDetails()
}

// Computed: permission for task group
const canViewTaskGroup = computed(() => permissionService.canViewTaskGroup())
const canEditTaskGroup = computed(() => permissionService.canManageTasks())
const canDeleteTaskGroup = computed(() => permissionService.canDeleteTasks())

onMounted(() => {
  if (props.dialog && props.taskGroupId) {
    fetchTaskGroupDetails()
  }
})
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="1200px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h5">Manage Task Group</span>
        <v-btn icon variant="text" @click="$emit('update:dialog', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text v-if="!canViewTaskGroup">
        <v-alert type="error">You dont have permission to perform this action</v-alert>
      </v-card-text>
      <v-card-text v-else>
        <!-- Notification for no permission -->
        <transition name="fade">
          <div
            v-if="noPermissionNotification"
            class="aws-style-notification"
            @click="closeNoPermissionNotification"
            style="
              position: fixed;
              top: 32px;
              right: 32px;
              z-index: 9999;
              min-width: 320px;
              max-width: 400px;
              background: #232f3e;
              color: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              padding: 18px 24px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 1rem;
            "
          >
            <v-icon color="warning" size="28">mdi-alert-circle</v-icon>
            <span>You dont have permission to perform this action</span>
            <v-spacer></v-spacer>
            <v-icon color="grey-lighten-1" size="20">mdi-close</v-icon>
          </div>
        </transition>
        <!-- Loading State -->
        <v-card-text v-if="loading">
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </v-col>
          </v-row>
          <v-row class="justify-center mt-4">
            <v-col cols="auto">
              <p class="text-h6">Loading task group details...</p>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Main Content -->
        <v-card-text v-else>
          <!-- Alert Messages -->
          <v-alert v-if="success" type="success" class="mb-4" :text="message"></v-alert>
          <v-alert v-if="error" type="error" class="mb-4" :text="message"></v-alert>

          <!-- Task Group Summary -->
          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="outlined" class="mb-4">
                <v-card-title>Task Group Overview</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="6" md="3">
                      <v-card class="text-center pa-3" color="primary" variant="tonal">
                        <v-card-title class="text-h4">{{ taskGroup.totalTasks }}</v-card-title>
                        <v-card-subtitle>Total Tasks</v-card-subtitle>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-card class="text-center pa-3" color="success" variant="tonal">
                        <v-card-title class="text-h4">{{ taskGroup.completedTasks }}</v-card-title>
                        <v-card-subtitle>Completed</v-card-subtitle>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-card class="text-center pa-3" color="info" variant="tonal">
                        <v-card-title class="text-h4">{{ taskGroup.totalUsers }}</v-card-title>
                        <v-card-subtitle>Assigned Users</v-card-subtitle>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-card class="text-center pa-3" color="warning" variant="tonal">
                        <v-card-title class="text-h4">{{ completionRate }}%</v-card-title>
                        <v-card-subtitle>Completion Rate</v-card-subtitle>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Tabs -->
          <v-tabs v-model="activeTab" class="mb-4">
            <v-tab value="overview">Overview</v-tab>
            <v-tab value="edit">Edit Task Group</v-tab>
          </v-tabs>

          <!-- Tab Content -->
          <v-window v-model="activeTab">
            <!-- Overview Tab -->
            <v-window-item value="overview">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-3">Tasks by User</h3>
                  <v-card
                    v-for="(task, index) in taskGroup.tasks"
                    :key="task._id"
                    class="mb-3"
                    variant="outlined"
                    @click="openTaskView(task)"
                    style="cursor: pointer"
                    hover
                  >
                    <v-card-title class="d-flex align-center">
                      <v-icon class="mr-2">mdi-account</v-icon>
                      {{ getUsernameById(task.userId) }}
                      <v-spacer></v-spacer>
                      <v-chip :color="getPriorityColor(task.priority)" size="small" class="mr-2">
                        {{ task.priority }}
                      </v-chip>
                      <v-chip :color="getSubmissionColor(task)" size="small">
                        {{ getSubmissionStatus(task) }}
                      </v-chip>
                    </v-card-title>
                    <v-card-text>
                      <v-row class="align-center">
                        <v-col cols="9">
                          <strong>{{ task.title }}</strong>
                          <p class="text-caption text-grey mb-0">
                            Start: {{ formatDate(task.startDate) }} &nbsp;&nbsp;Due:
                            {{ formatDate(task.dueDate) }}
                          </p>
                        </v-col>
                        <v-col cols="3" class="text-right">
                          <v-chip color="info" size="small" class="mb-1">
                            Weight: {{ task.weighted }}
                          </v-chip>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Edit Tab -->
            <v-window-item value="edit">
              <v-form @submit.prevent="canEditTaskGroup ? updateTaskGroup() : showNoPermission()">
                <v-row class="pa-2">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.title"
                      label="Task Title"
                      required
                      variant="outlined"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="editForm.category"
                      :items="categoryOptions"
                      label="Category"
                      required
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="editForm.description"
                      label="Description"
                      rows="3"
                      variant="outlined"
                    ></v-textarea>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="editForm.priority"
                      :items="priorityOptions"
                      label="Priority"
                      required
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.dueDate"
                      label="Due Date"
                      type="date"
                      required
                      variant="outlined"
                      min="2025-01-01"
                      max="2035-12-31"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="editForm.weighted"
                      label="Task Weight"
                      type="number"
                      min="0"
                      required
                      variant="outlined"
                      hint="Higher weight = more important task"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-select
                      v-model="editForm.assignedUsers"
                      :items="teamMemberOptions"
                      label="Assigned Users"
                      multiple
                      chips
                      closable-chips
                      required
                      variant="outlined"
                      hint="Select which team members should complete this task"
                      persistent-hint
                    >
                      <template v-slot:selection="{ item, index }">
                        <v-chip
                          v-if="index < 3"
                          :key="item.value"
                          size="small"
                          closable
                          @click:close="removeUser(item.value)"
                        >
                          {{ item.title }}
                        </v-chip>
                        <span v-if="index === 3" class="text-grey text-caption align-self-center">
                          (+{{ editForm.assignedUsers.length - 3 }} others)
                        </span>
                      </template>
                    </v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-row>
                      <v-col cols="auto">
                        <v-btn
                          type="button"
                          color="primary"
                          :loading="saving"
                          size="large"
                          @click="canEditTaskGroup ? updateTaskGroup() : showNoPermission()"
                        >
                          Update Task Group
                        </v-btn>
                      </v-col>
                      <v-col cols="auto">
                        <v-btn
                          type="button"
                          @click="canDeleteTaskGroup ? deleteTaskGroup() : showNoPermission()"
                          color="red-darken-2"
                          :loading="saving"
                          size="large"
                          variant="outlined"
                        >
                          Delete Task Group
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-col>
                </v-row>
              </v-form>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card-text>
    </v-card>

    <!-- EnhancedTaskView Dialog -->
    <EnhancedTaskView
      v-model:dialog="viewTaskDialog"
      :task="selectedTask"
      :user-id="userProps.userId"
      @task-updated="handleTaskUpdated"
    />
  </v-dialog>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.aws-style-notification:hover {
  filter: brightness(0.95);
}
</style>
