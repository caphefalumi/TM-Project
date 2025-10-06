<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isLoading: Boolean,
  userLoaded: Boolean,
  tasks: Array,
  user: Object,
  taskSearchQuery: String,
  taskTagSearchQuery: String,
  taskFilterType: String,
  taskCurrentPage: Number,
  taskItemsPerPage: Number,
  taskFilterOptions: Array
})

const emit = defineEmits([
  'update:taskSearchQuery',
  'update:taskTagSearchQuery',
  'update:taskFilterType',
  'update:taskCurrentPage',
  'submit-task'
])

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

const filteredAndSortedTasks = computed(() => {
  let filtered = props.tasks

  // Filter by task name search
  if (props.taskSearchQuery) {
    const searchTerm = props.taskSearchQuery.trim()
    filtered = filtered.filter((task) => {
      const taskTitle = task.title
      return taskTitle.includes(searchTerm)
    })
  }

  // Filter by tag search
  if (props.taskTagSearchQuery) {
    const tagSearchTerms = props.taskTagSearchQuery.trim().split(/\s+/)
    filtered = filtered.filter((task) => {
      const taskTags = task.tags ? task.tags.map((tag) => tag.toLowerCase()) : []

      // Check if all search terms match any tag (AND logic for multiple tags)
      return tagSearchTerms.every((term) => {
        return taskTags.some((tag) => tag.includes(term))
      })
    })
  }

  // Filter by task type
  const now = new Date()
  if (props.taskFilterType === 'not-submitted') {
    filtered = filtered.filter((task) => !task.submitted)
  } else if (props.taskFilterType === 'pending') {
    filtered = filtered.filter((task) => {
      const startDate = new Date(task.startDate)
      const dueDate = new Date(task.dueDate)
      return now >= startDate && now <= dueDate
    })
  }

  // Sort by most recently due date (closest due date first)
  return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
})

const paginatedTasks = computed(() => {
  const start = (props.taskCurrentPage - 1) * props.taskItemsPerPage
  const end = start + props.taskItemsPerPage
  return filteredAndSortedTasks.value.slice(start, end)
})

const totalTaskPages = computed(() => {
  return Math.ceil(filteredAndSortedTasks.value.length / props.taskItemsPerPage)
})
</script>

<template>
  <!-- Loading State for Tasks -->
  <div v-if="isLoading">
    <!-- Header skeleton -->
    <v-row>
      <v-col cols="12">
        <v-skeleton-loader type="heading" width="200px" class="mb-4"></v-skeleton-loader>
      </v-col>

      <!-- Search controls skeleton -->
      <v-col cols="12">
        <v-row>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="text" height="40px"></v-skeleton-loader>
          </v-col>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="text" height="40px"></v-skeleton-loader>
          </v-col>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="text" height="40px"></v-skeleton-loader>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Tasks skeleton grid -->
    <v-row>
      <v-col v-for="n in 6" :key="`task-skeleton-${n}`" cols="12" md="6" lg="4">
        <v-card class="mb-4 elevation-2">
          <v-card-item>
            <v-skeleton-loader type="list-item-two-line"></v-skeleton-loader>
            <div class="d-flex gap-2 mt-2">
              <v-skeleton-loader type="chip" width="60px"></v-skeleton-loader>
              <v-skeleton-loader type="chip" width="80px"></v-skeleton-loader>
            </div>
          </v-card-item>
          <v-card-text>
            <v-skeleton-loader type="paragraph" max-width="100%"></v-skeleton-loader>
            <v-skeleton-loader type="text" width="100px" class="mb-2"></v-skeleton-loader>
            <div class="d-flex justify-space-between">
              <v-skeleton-loader type="text" width="80px"></v-skeleton-loader>
              <v-skeleton-loader type="text" width="80px"></v-skeleton-loader>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-skeleton-loader type="chip" width="100px"></v-skeleton-loader>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <!-- Actual Tasks Content -->
  <div v-else>
    <!-- Tasks Header and Controls -->
    <v-row v-if="userLoaded">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <h2 class="text-h5">Your Tasks ({{ filteredAndSortedTasks.length }})</h2>
        </div>
      </v-col>

      <!-- Search and Filter Controls -->
      <v-col cols="12">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              :model-value="taskSearchQuery"
              @update:model-value="$emit('update:taskSearchQuery', $event)"
              label="Search by task name"
              placeholder="e.g., Project Report"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              :model-value="taskTagSearchQuery"
              @update:model-value="$emit('update:taskTagSearchQuery', $event)"
              label="Search by tags"
              placeholder="e.g., urgent development"
              prepend-inner-icon="mdi-tag-multiple"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              :model-value="taskFilterType"
              @update:model-value="$emit('update:taskFilterType', $event)"
              :items="taskFilterOptions"
              label="Filter tasks"
              variant="outlined"
              density="compact"
              hide-details
            ></v-select>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Tasks Grid -->
    <v-row v-if="paginatedTasks.length > 0 && userLoaded">
      <v-col v-for="task in paginatedTasks" :key="task._id" cols="12" md="6" lg="4">
        <v-card class="mb-4 elevation-2 project-card" @click="$emit('submit-task', task._id)">
          <v-card-item>
            <v-card-title>{{ task.title }}</v-card-title>
            <v-card-subtitle>
              <v-chip :color="getPriorityColor(task.priority)" class="mr-2">
                {{ task.priority }}
              </v-chip>
              <v-chip color="purple-darken-2">
                {{ task.category }}
              </v-chip>
              <v-chip-group>
                <v-chip
                  v-for="tag in task.tags"
                  :key="tag"
                  color="black"
                  size="small"
                  class="ml-1"
                >
                  {{ tag }}
                </v-chip>
              </v-chip-group>
            </v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <p>{{ task.description }}</p>
            <div class="text-caption">
              <span>Weight: {{ task.weighted }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span>Start: {{ new Date(task.startDate).toLocaleDateString() }}</span>
              <span>Due: {{ new Date(task.dueDate).toLocaleDateString() }}</span>
            </div>
          </v-card-text>
          <v-card-actions v-if="!task.submitted">
            <v-chip color="red" text-color="white">No Submission</v-chip>
          </v-card-actions>
          <v-card-actions v-else>
            <v-chip color="green" text-color="white">Submitted</v-chip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <v-row v-if="totalTaskPages > 1 && userLoaded">
      <v-col cols="12" class="d-flex justify-center">
        <v-pagination
          :model-value="taskCurrentPage"
          @update:model-value="$emit('update:taskCurrentPage', $event)"
          :length="totalTaskPages"
          :total-visible="7"
          color="primary"
        ></v-pagination>
      </v-col>
    </v-row>

    <!-- No Tasks State -->
    <v-row v-else-if="userLoaded && filteredAndSortedTasks.length === 0 && tasks.length > 0">
      <v-col cols="12">
        <v-alert type="info" class="text-center">
          No tasks match your current search and filter criteria.
        </v-alert>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else-if="userLoaded && tasks.length === 0">
      <v-col cols="12">
        <v-alert type="info" class="text-center"> No tasks found. </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.project-card {
  transition: all 0.3s ease;
  border: 1px solid;
  cursor: pointer;
  min-height: 60px;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
}
</style>
