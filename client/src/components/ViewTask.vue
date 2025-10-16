<script setup>
import { ref, onMounted, computed } from 'vue'

const emit = defineEmits(['update:dialog'])

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  task: {
    type: Object,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
})

// State
const loading = ref(false)
const taskDetails = ref({})
const submission = ref(null)
const error = ref(false)
const message = ref('')

// Computed properties
const hasSubmission = computed(() => {
  return (
    submission.value &&
    submission.value.submissionData &&
    submission.value.submissionData.length > 0
  )
})

const submissionDate = computed(() => {
  if (submission.value && submission.value.submittedAt) {
    return new Date(submission.value.submittedAt).toLocaleString()
  }
  return 'Not submitted'
})

// Methods
const fetchTaskDetails = async () => {
  if (!props.task._id || !props.teamId) return

  loading.value = true
  error.value = false

  try {
    const PORT = import.meta.env.VITE_API_PORT

    // First, get the task details from the task group
    const taskGroupResponse = await fetch(
      `${PORT}/api/teams/${props.teamId}/task-groups/${props.task.taskGroupId}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (taskGroupResponse.ok) {
      const taskGroupResult = await taskGroupResponse.json()
      // Find the specific task for this user
      const specificTask = taskGroupResult.tasks.find((task) => task._id === props.task._id)
      taskDetails.value = specificTask || props.task
    } else {
      taskDetails.value = props.task
    }

    // Then, try to get the submission details
    const submissionResponse = await fetch(
      `${PORT}/api/tasks/submission/${props.teamId}/${props.task._id}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (submissionResponse.ok) {
      const submissionResult = await submissionResponse.json()
      submission.value = submissionResult.submission
    } else {
      // No submission found, which is normal for unsubmitted tasks
      submission.value = null
    }
  } catch (err) {
    console.log('Error fetching task details:', err)
    error.value = true
    message.value = 'Failed to fetch task details'
    // Fallback to props data
    taskDetails.value = props.task
    submission.value = null
  } finally {
    loading.value = false
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

const getSubmissionColor = (submitted) => {
  return submitted ? 'success' : 'warning'
}

const getSubmissionIcon = (submitted) => {
  return submitted ? 'mdi-check-circle' : 'mdi-clock-outline'
}

const formatUrl = (url) => {
  if (!url || url === '(Not provided)') return url

  // Check if URL already has a protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Add https:// as default protocol
  return `https://${url}`
}

const getImageUrl = (fileId) => {
  const PORT = import.meta.env.VITE_API_PORT || 'http://localhost:3000'
  return `${PORT}/api/images/${fileId}`
}

onMounted(() => {
  if (props.dialog) {
    fetchTaskDetails()
  }
})

// Watch for dialog changes to fetch data
import { watch } from 'vue'
watch(
  () => props.dialog,
  (newVal) => {
    if (newVal) {
      fetchTaskDetails()
    }
  },
)
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="800px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-clipboard-text</v-icon>
          <span class="text-h5">Task Details</span>
        </div>
        <v-btn icon variant="text" @click="$emit('update:dialog', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Loading State -->
      <v-card-text v-if="loading">
        <v-row class="justify-center">
          <v-col cols="auto">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          </v-col>
        </v-row>
        <v-row class="justify-center mt-4">
          <v-col cols="auto">
            <p class="text-h6">Loading task details...</p>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Main Content -->
      <v-card-text v-else>
        <!-- Error Alert -->
        <v-alert v-if="error" type="warning" class="mb-4" :text="message"></v-alert>

        <!-- Task Information -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-account</v-icon>
            {{ username }}
            <v-spacer></v-spacer>
            <v-chip :color="getPriorityColor(taskDetails.priority)" size="small" class="mr-2">
              {{ taskDetails.priority }}
            </v-chip>
            <v-chip :color="getSubmissionColor(taskDetails.submitted)" size="small">
              <v-icon left size="small">{{ getSubmissionIcon(taskDetails.submitted) }}</v-icon>
              {{ taskDetails.submitted ? 'Submitted' : 'Pending' }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <h3 class="text-h6 mb-2">{{ taskDetails.title }}</h3>
                <p v-if="taskDetails.description" class="text-body-1 mb-3">
                  {{ taskDetails.description }}
                </p>
                <div class="d-flex flex-wrap gap-4">
                  <div><strong>Category:</strong> {{ taskDetails.category }}</div>
                  <v-spacer></v-spacer>
                  <div><strong>Due Date:</strong> {{ formatDate(taskDetails.dueDate) }}</div>
                  <div v-if="taskDetails.assignedDate">
                    <strong>Assigned:</strong> {{ formatDate(taskDetails.assignedDate) }}
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Submission Section -->
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-file-document</v-icon>
            Submission Details
            <v-spacer></v-spacer>
            <v-chip :color="hasSubmission ? 'success' : 'grey'" size="small">
              {{ hasSubmission ? 'Submitted' : 'No Submission' }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <div v-if="hasSubmission">
              <div class="mb-3"><strong>Submitted on:</strong> {{ submissionDate }}</div>
              <div class="mb-3">
                <strong>Submission Details:</strong>
              </div>

              <!-- Display submission data fields -->
              <v-card variant="outlined" color="grey-lighten-3" class="pa-3">
                <div v-for="field in submission.submissionData" :key="field.label" class="mb-3">
                  <div class="d-flex align-center mb-1">
                    <strong class="text-subtitle-2 text-black">{{ field.label }}:</strong>
                    <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">{{
                      field.type
                    }}</v-chip>
                  </div>

                  <!-- Display field value based on type -->
                  <div class="ml-2">
                    <div
                      v-if="field.type === 'Image' && field.value && field.value !== '(No image)'"
                    >
                      <!-- Check if it's a GridFS file ID or base64 -->
                      <v-img
                        v-if="field.value.startsWith('data:image')"
                        :src="field.value"
                        max-width="1000"
                        max-height="600"
                        class="rounded"
                      ></v-img>
                      <v-img
                        v-else
                        :src="getImageUrl(field.value)"
                        max-width="1000"
                        max-height="600"
                        class="rounded"
                        :loading="true"
                      ></v-img>
                    </div>
                    <div v-else-if="field.type === 'Date'" class="text-black">
                      {{ formatDate(field.value) }}
                    </div>
                    <div v-else-if="field.type === 'URLs'">
                      <a
                        v-if="field.value && field.value !== '(Not provided)'"
                        :href="formatUrl(field.value)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary"
                      >
                        {{ field.value }}
                      </a>
                      <span v-else class="text-grey-darken-2">{{ field.value }}</span>
                    </div>
                    <div v-else-if="field.type === 'Long text'">
                      <pre
                        class="text-body-2 text-black"
                        style="white-space: pre-wrap; font-family: inherit"
                        >{{ field.value }}</pre
                      >
                    </div>
                    <div v-else>
                      <span
                        :class="
                          field.value === '(Not provided)' || field.value === '(No image)'
                            ? 'text-grey-darken-2'
                            : 'text-black'
                        "
                      >
                        {{ field.value }}
                      </span>
                    </div>
                  </div>
                  <v-divider
                    v-if="
                      submission.submissionData.indexOf(field) <
                      submission.submissionData.length - 1
                    "
                    class="mt-2"
                  ></v-divider>
                </div>
              </v-card>
            </div>
            <div v-else class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1">mdi-file-outline</v-icon>
              <p class="text-h6 text-grey mt-2">No submission yet</p>
              <p class="text-body-2 text-grey">This task hasn't been submitted by {{ username }}</p>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="$emit('update:dialog', false)">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
