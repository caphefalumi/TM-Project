<template>
  <v-select
    v-model="localStatus"
    :items="statusOptions"
    label="Status"
    density="compact"
    variant="outlined"
    :disabled="disabled"
    @update:model-value="updateStatus"
    :color="getStatusColor(localStatus)"
  >
    <template #selection="{ item }">
      <v-chip :color="getStatusColor(item.value)" size="small">
        {{ item.value }}
      </v-chip>
    </template>
    <template #item="{ props, item }">
      <v-list-item v-bind="props" :title="item.value">
        <template #prepend>
          <v-icon :color="getStatusColor(item.value)">
            {{ getStatusIcon(item.value) }}
          </v-icon>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  taskId: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['statusUpdated', 'error'])

const statusOptions = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked']
const localStatus = ref(props.status)

watch(
  () => props.status,
  (newStatus) => {
    localStatus.value = newStatus
  },
)

const getStatusColor = (status) => {
  const colors = {
    'To Do': 'grey',
    'In Progress': 'blue',
    'In Review': 'orange',
    Done: 'green',
    Blocked: 'red',
  }
  return colors[status] || 'grey'
}

const getStatusIcon = (status) => {
  const icons = {
    'To Do': 'mdi-checkbox-blank-circle-outline',
    'In Progress': 'mdi-play-circle',
    'In Review': 'mdi-eye',
    Done: 'mdi-check-circle',
    Blocked: 'mdi-alert-circle',
  }
  return icons[status] || 'mdi-circle'
}

const updateStatus = async (newStatus) => {
  if (newStatus === props.status) return

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/tasks/${props.taskId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    })

    if (response.ok) {
      emit('statusUpdated', newStatus)
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to update status')
      localStatus.value = props.status // Revert on error
    }
  } catch (error) {
    console.error('Error updating status:', error)
    emit('error', 'Failed to update status')
    localStatus.value = props.status // Revert on error
  }
}
</script>
