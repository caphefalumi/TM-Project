<script setup>
import { computed } from 'vue'

const props = defineProps({
  taskGroups: Array,
  refreshingTaskGroups: Boolean,
  newTaskDialog: Boolean
})

const emit = defineEmits([
  'refresh-task-groups',
  'update:newTaskDialog',
  'open-task-group-dialog'
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

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <!-- Loading State for Task Groups -->
  <div v-if="refreshingTaskGroups">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-3">
          <v-skeleton-loader type="heading" width="300px"></v-skeleton-loader>
          <v-skeleton-loader type="button" width="100px" height="32px"></v-skeleton-loader>
        </div>
      </v-col>
    </v-row>

    <!-- Overview skeleton -->
    <v-row>
      <v-col cols="12">
        <v-card class="mb-4" variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-skeleton-loader type="text" width="200px"></v-skeleton-loader>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6" md="3" v-for="n in 4" :key="`overview-skeleton-${n}`">
                <v-card class="text-center pa-3" variant="tonal">
                  <v-card-title>
                    <v-skeleton-loader type="text" width="40px" class="mx-auto"></v-skeleton-loader>
                  </v-card-title>
                  <v-card-subtitle>
                    <v-skeleton-loader type="text" width="80px" class="mx-auto"></v-skeleton-loader>
                  </v-card-subtitle>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Task groups skeleton -->
    <v-row>
      <v-col cols="12">
        <v-skeleton-loader type="heading" width="150px" class="mb-3"></v-skeleton-loader>
      </v-col>
      <v-col v-for="n in 6" :key="`taskgroup-skeleton-${n}`" cols="12" md="6" lg="4">
        <v-card class="mb-4 elevation-2" variant="outlined">
          <v-card-item>
            <v-card-title class="d-flex align-center">
              <v-skeleton-loader type="text" width="200px"></v-skeleton-loader>
              <v-spacer></v-spacer>
              <v-skeleton-loader type="chip" width="60px"></v-skeleton-loader>
            </v-card-title>
            <v-skeleton-loader type="text" width="150px" class="mb-1"></v-skeleton-loader>
            <v-skeleton-loader type="text" width="120px"></v-skeleton-loader>
          </v-card-item>

          <v-card-text>
            <!-- Progress skeleton -->
            <div class="mb-3">
              <div class="d-flex justify-space-between mb-1">
                <v-skeleton-loader type="text" width="60px" height="12px"></v-skeleton-loader>
                <v-skeleton-loader type="text" width="30px" height="12px"></v-skeleton-loader>
              </div>
              <v-skeleton-loader type="divider" height="8px" class="rounded"></v-skeleton-loader>
            </div>

            <!-- Statistics skeleton -->
            <v-row class="text-center">
              <v-col cols="6">
                <v-skeleton-loader type="text" width="30px" class="mx-auto mb-1"></v-skeleton-loader>
                <v-skeleton-loader type="text" width="60px" class="mx-auto" height="12px"></v-skeleton-loader>
              </v-col>
              <v-col cols="6">
                <v-skeleton-loader type="text" width="30px" class="mx-auto mb-1"></v-skeleton-loader>
                <v-skeleton-loader type="text" width="60px" class="mx-auto" height="12px"></v-skeleton-loader>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions>
            <v-skeleton-loader type="button" width="80px"></v-skeleton-loader>
            <v-spacer></v-spacer>
            <v-skeleton-loader type="chip" width="80px"></v-skeleton-loader>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <!-- Actual Task Groups Content -->
  <div v-else>
    <v-row>
      <v-col cols="12">
        <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-2 mb-3">
          <h2 class="text-h5">Manage Team - Task Groups</h2>
          <v-btn
            color="primary"
            variant="outlined"
            size="large"
            class="flex-grow-1 flex-md-grow-0 mt-4"
            @click="$emit('refresh-task-groups')"
            :loading="refreshingTaskGroups"
          >
            <v-icon start>mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Task Groups Overview -->
    <v-row v-if="taskGroups.length > 0">
      <v-col cols="12">
        <v-card class="mb-4" variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-view-dashboard</v-icon>
            Task Groups Overview
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6" md="3">
                <v-card class="text-center pa-3" color="primary" variant="tonal">
                  <v-card-title class="text-h4">{{ taskGroups.length }}</v-card-title>
                  <v-card-subtitle>Total Task Groups</v-card-subtitle>
                </v-card>
              </v-col>
              <v-col cols="6" md="3">
                <v-card class="text-center pa-3" color="success" variant="tonal">
                  <v-card-title class="text-h4">{{
                    taskGroups.reduce((sum, group) => sum + group.totalTasks, 0)
                  }}</v-card-title>
                  <v-card-subtitle>Total Tasks</v-card-subtitle>
                </v-card>
              </v-col>
              <v-col cols="6" md="3">
                <v-card class="text-center pa-3" color="info" variant="tonal">
                  <v-card-title class="text-h4">{{
                    taskGroups.reduce((sum, group) => sum + group.completedTasks, 0)
                  }}</v-card-title>
                  <v-card-subtitle>Completed Tasks</v-card-subtitle>
                </v-card>
              </v-col>
              <v-col cols="6" md="3">
                <v-card class="text-center pa-3" color="warning" variant="tonal">
                  <v-card-title class="text-h4">
                    {{
                      taskGroups.length > 0
                        ? Math.round(
                            taskGroups.reduce(
                              (sum, group) => sum + parseFloat(group.completionRate),
                              0,
                            ) / taskGroups.length,
                          )
                        : 0
                    }}%
                  </v-card-title>
                  <v-card-subtitle>Avg Completion</v-card-subtitle>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Task Groups List -->
    <v-row v-if="taskGroups.length > 0">
      <v-col cols="12">
        <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-2 mb-3">
          <h3 class="text-h6">Task Groups</h3>
          <v-btn
            v-tooltip:bottom="'Add new tasks to the team'"
            @click="$emit('update:newTaskDialog', true)"
            color="primary"
            class="project-card rounded-lg font-weight-bold flex-grow-1 flex-md-grow-0"
            size="large"
            variant="outlined"
          >
            <v-icon start>mdi-file-document-plus-outline</v-icon>
            Add New Tasks
          </v-btn>
        </div>
      </v-col>
      <v-col
        v-for="taskGroup in taskGroups"
        :key="taskGroup.taskGroupId"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          class="mb-4 elevation-2 project-card task-group-card"
          @click="$emit('open-task-group-dialog', taskGroup.taskGroupId)"
          variant="outlined"
        >
          <v-card-item>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-folder-multiple</v-icon>
              {{ taskGroup.title }}
              <v-spacer></v-spacer>
              <v-chip :color="getPriorityColor(taskGroup.priority)" size="small">
                {{ taskGroup.priority }}
              </v-chip>
            </v-card-title>
            <v-card-subtitle> Category: {{ taskGroup.category }} </v-card-subtitle>
            <v-card-subtitle class="text-caption">
              Due: {{ formatDate(taskGroup.dueDate) }}
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <!-- Progress Bar -->
            <div class="mb-3">
              <div class="d-flex justify-space-between mb-1">
                <span class="text-caption">Progress</span>
                <span class="text-caption">{{ taskGroup.completionRate }}%</span>
              </div>
              <v-progress-linear
                :model-value="taskGroup.completionRate"
                color="success"
                height="8"
                rounded
              ></v-progress-linear>
            </div>

            <!-- Task Statistics -->
            <v-row class="text-center">
              <v-col cols="6">
                <div class="text-h6 font-weight-bold">{{ taskGroup.totalTasks }}</div>
                <div class="text-caption text-grey">Total Tasks</div>
              </v-col>
              <v-col cols="6">
                <div class="text-h6 font-weight-bold text-success">
                  {{ taskGroup.completedTasks }}
                </div>
                <div class="text-caption text-grey">Completed</div>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions>
            <v-btn
              variant="outlined"
              size="small"
              @click.stop="$emit('open-task-group-dialog', taskGroup.taskGroupId)"
            >
              <v-icon start>mdi-cog</v-icon>
              Manage
            </v-btn>
            <v-spacer></v-spacer>
            <v-chip variant="outlined" size="small" color="primary">
              Weight: {{ taskGroup.totalWeight }}
            </v-chip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Task Groups State -->
    <v-row v-else>
      <v-col cols="12">
        <v-card class="text-center pa-6" variant="outlined">
          <v-card-text>
            <v-icon size="64" class="mb-4" color="grey">mdi-folder-open</v-icon>
            <h3 class="text-h6 mb-2">No Task Groups Found</h3>
            <p class="text-grey mb-4">
              Task groups will appear here when you create tasks for team members.
            </p>
            <v-btn color="primary" @click="$emit('update:newTaskDialog', true)" size="large">
              <v-icon start>mdi-plus</v-icon>
              Create Task Group
            </v-btn>
          </v-card-text>
        </v-card>
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

.task-group-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.task-group-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(var(--v-theme-primary), 0.3);
}
</style>
