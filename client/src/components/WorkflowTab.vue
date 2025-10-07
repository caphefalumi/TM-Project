<script setup>
import WorkflowView from './WorkflowView.vue'

const props = defineProps({
  taskGroups: Array,
  refreshingTaskGroups: Boolean
})

const emit = defineEmits(['refresh-task-groups'])
</script>

<template>
  <v-row>
    <v-col cols="12">
      <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-2 mb-3">
        <h2 class="text-h5">Team's Workflow</h2>
        <v-btn
          color="primary"
          variant="outlined"
          size="large"
          class="flex-grow-1 flex-md-grow-0 mt-2"
          @click="$emit('refresh-task-groups')"
          :loading="refreshingTaskGroups"
        >
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>
      </div>
    </v-col>
  </v-row>
  <div>
    <WorkflowView :task-groups="taskGroups" />
  </div>
</template>
