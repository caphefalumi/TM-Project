<template>
  <v-dialog :model-value="dialog" @update:model-value="$emit('update:dialog', $event)" max-width="1200px" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-clipboard-text</v-icon>
          <span class="text-h5">{{ task.title }}</span>
        </div>
        <v-btn icon variant="text" @click="$emit('update:dialog', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-container fluid>
          <v-row>
            <!-- Main content column -->
            <v-col cols="12" md="8">
              <v-card variant="outlined" class="mb-4">
                <v-card-text>
                  <div class="mb-3">
                    <TaskStatusSelector
                      :status="task.status || 'To Do'"
                      :task-id="task._id"
                      @status-updated="handleStatusUpdate"
                      @error="handleError"
                    />
                  </div>
                  <v-divider class="my-3" />
                  <div class="text-subtitle-2 mb-2">Description</div>
                  <div>{{ task.description || 'No description provided' }}</div>
                </v-card-text>
              </v-card>

              <v-tabs v-model="activeTab" class="mb-4">
                <v-tab value="comments">
                  <v-icon left>mdi-comment</v-icon>
                  Comments
                </v-tab>
                <v-tab value="activity">
                  <v-icon left>mdi-history</v-icon>
                  Activity
                </v-tab>
                <v-tab value="time">
                  <v-icon left>mdi-clock</v-icon>
                  Time Tracking
                </v-tab>
              </v-tabs>

              <v-window v-model="activeTab">
                <v-window-item value="comments">
                  <TaskComments
                    :task-id="task._id"
                    :user-id="userId"
                    @comment-added="handleCommentAdded"
                    @error="handleError"
                  />
                </v-window-item>

                <v-window-item value="activity">
                  <TaskActivity :task-id="task._id" />
                </v-window-item>

                <v-window-item value="time">
                  <TaskTimeTracking
                    :task-id="task._id"
                    :estimated-hours="task.estimatedHours || 0"
                    :logged-hours="task.loggedHours || 0"
                    @time-logged="handleTimeLogged"
                    @estimate-updated="handleEstimateUpdated"
                    @error="handleError"
                  />
                </v-window-item>
              </v-window>
            </v-col>

            <!-- Sidebar column -->
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="mb-4">
                <v-card-text>
                  <div class="text-subtitle-2 mb-2">Details</div>

                  <div class="mb-3">
                    <div class="text-caption text-grey mb-1">Assignee</div>
                    <div>{{ task.assignee || task.username || 'Unassigned' }}</div>
                  </div>

                  <v-divider class="my-3" />

                  <div class="mb-3">
                    <div class="text-caption text-grey mb-1">Priority</div>
                    <v-chip :color="getPriorityColor(task.priority)" size="small">
                      {{ task.priority }}
                    </v-chip>
                  </div>

                  <v-divider class="my-3" />

                  <div class="mb-3">
                    <div class="text-caption text-grey mb-1">Category</div>
                    <div>{{ task.category }}</div>
                  </div>

                  <v-divider class="my-3" />

                  <div class="mb-3">
                    <div class="text-caption text-grey mb-1">Due Date</div>
                    <div>{{ formatDate(task.dueDate) }}</div>
                  </div>

                  <v-divider class="my-3" />

                  <div class="mb-3">
                    <div class="text-caption text-grey mb-1">Start Date</div>
                    <div>{{ formatDate(task.startDate) }}</div>
                  </div>

                  <v-divider class="my-3" />

                  <div v-if="task.tags && task.tags.length > 0" class="mb-3">
                    <div class="text-caption text-grey mb-1">Tags</div>
                    <v-chip
                      v-for="tag in task.tags"
                      :key="tag"
                      size="small"
                      class="mr-1 mb-1"
                      variant="outlined"
                    >
                      {{ tag }}
                    </v-chip>
                  </div>

                  <v-divider class="my-3" />

                  <div class="mb-3">
                    <div class="text-caption text-grey mb-1">Progress</div>
                    <v-progress-linear
                      :model-value="getProgress()"
                      :color="getProgressColor()"
                      height="8"
                      rounded
                    />
                    <div class="text-caption text-grey mt-1">
                      {{ task.loggedHours || 0 }}h / {{ task.estimatedHours || 0 }}h logged
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="$emit('update:dialog', false)">Close</v-btn>
      </v-card-actions>

      <!-- Snackbar for notifications -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
        {{ snackbarMessage }}
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import TaskStatusSelector from './TaskStatusSelector.vue'
import TaskComments from './TaskComments.vue'
import TaskActivity from './TaskActivity.vue'
import TaskTimeTracking from './TaskTimeTracking.vue'

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  task: {
    type: Object,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:dialog', 'taskUpdated'])

const activeTab = ref('comments')
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

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

const getProgress = () => {
  if (!props.task.estimatedHours || props.task.estimatedHours === 0) return 0
  return Math.min((props.task.loggedHours / props.task.estimatedHours) * 100, 100)
}

const getProgressColor = () => {
  const progress = getProgress()
  if (progress >= 100) return 'red'
  if (progress >= 80) return 'orange'
  if (progress >= 50) return 'blue'
  return 'green'
}

const handleStatusUpdate = (newStatus) => {
  showSnackbar('Status updated successfully', 'success')
  emit('taskUpdated')
}

const handleCommentAdded = () => {
  showSnackbar('Comment added successfully', 'success')
}

const handleTimeLogged = () => {
  showSnackbar('Time logged successfully', 'success')
  emit('taskUpdated')
}

const handleEstimateUpdated = () => {
  showSnackbar('Estimate updated successfully', 'success')
  emit('taskUpdated')
}

const handleError = (message) => {
  showSnackbar(message, 'error')
}

const showSnackbar = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>
