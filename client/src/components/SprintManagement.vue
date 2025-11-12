<template>
  <v-dialog v-model="dialog" max-width="800px">
    <template #activator="{ props }">
      <v-btn color="primary" v-bind="props">
        <v-icon>mdi-calendar-plus</v-icon>
        Manage Sprints
      </v-btn>
    </template>

    <v-card>
      <v-card-title>Sprint Management</v-card-title>
      <v-divider />
      <v-card-text>
        <v-tabs v-model="tab">
          <v-tab value="list">Sprints</v-tab>
          <v-tab value="create">Create Sprint</v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <!-- List Sprints -->
          <v-window-item value="list">
            <v-list v-if="sprints.length > 0">
              <v-list-item v-for="sprint in sprints" :key="sprint._id" class="mb-2">
                <template #prepend>
                  <v-chip :color="getSprintColor(sprint.status)" size="small">
                    {{ sprint.status }}
                  </v-chip>
                </template>
                <v-list-item-title>{{ sprint.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
                </v-list-item-subtitle>
                <v-list-item-subtitle v-if="sprint.goal">{{ sprint.goal }}</v-list-item-subtitle>
                <template #append>
                  <v-btn
                    v-if="sprint.status === 'planned'"
                    icon
                    size="small"
                    variant="text"
                    @click="startSprint(sprint._id)"
                  >
                    <v-icon>mdi-play</v-icon>
                  </v-btn>
                  <v-btn
                    v-if="sprint.status === 'active'"
                    icon
                    size="small"
                    variant="text"
                    @click="completeSprint(sprint._id)"
                  >
                    <v-icon>mdi-check</v-icon>
                  </v-btn>
                  <v-btn icon size="small" variant="text" @click="deleteSprint(sprint._id)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center text-grey py-8">No sprints yet. Create one to get started!</div>
          </v-window-item>

          <!-- Create Sprint -->
          <v-window-item value="create">
            <v-form ref="form" @submit.prevent="createSprint" class="mt-4">
              <v-text-field v-model="newSprint.name" label="Sprint Name" variant="outlined" required />
              <v-textarea v-model="newSprint.goal" label="Sprint Goal" variant="outlined" rows="2" />
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="newSprint.startDate"
                    label="Start Date"
                    type="date"
                    variant="outlined"
                    required
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="newSprint.endDate"
                    label="End Date"
                    type="date"
                    variant="outlined"
                    required
                  />
                </v-col>
              </v-row>
              <v-btn color="primary" type="submit" :loading="creating" block> Create Sprint </v-btn>
            </v-form>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  teamId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['sprintCreated', 'sprintUpdated', 'error'])

const dialog = ref(false)
const tab = ref('list')
const sprints = ref([])
const creating = ref(false)
const newSprint = ref({
  name: '',
  goal: '',
  startDate: '',
  endDate: '',
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

const getSprintColor = (status) => {
  const colors = {
    planned: 'grey',
    active: 'green',
    completed: 'blue',
  }
  return colors[status] || 'grey'
}

const fetchSprints = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/sprints/team/${props.teamId}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      sprints.value = data.sprints
    }
  } catch (error) {
    console.error('Error fetching sprints:', error)
  }
}

const createSprint = async () => {
  if (!newSprint.value.name || !newSprint.value.startDate || !newSprint.value.endDate) {
    emit('error', 'Please fill in all required fields')
    return
  }

  creating.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/sprints`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamId: props.teamId,
        ...newSprint.value,
      }),
    })

    if (response.ok) {
      newSprint.value = { name: '', goal: '', startDate: '', endDate: '' }
      await fetchSprints()
      tab.value = 'list'
      emit('sprintCreated')
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to create sprint')
    }
  } catch (error) {
    console.error('Error creating sprint:', error)
    emit('error', 'Failed to create sprint')
  } finally {
    creating.value = false
  }
}

const startSprint = async (sprintId) => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/sprints/${sprintId}/start`, {
      method: 'POST',
      credentials: 'include',
    })

    if (response.ok) {
      await fetchSprints()
      emit('sprintUpdated')
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to start sprint')
    }
  } catch (error) {
    console.error('Error starting sprint:', error)
    emit('error', 'Failed to start sprint')
  }
}

const completeSprint = async (sprintId) => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/sprints/${sprintId}/complete`, {
      method: 'POST',
      credentials: 'include',
    })

    if (response.ok) {
      await fetchSprints()
      emit('sprintUpdated')
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to complete sprint')
    }
  } catch (error) {
    console.error('Error completing sprint:', error)
    emit('error', 'Failed to complete sprint')
  }
}

const deleteSprint = async (sprintId) => {
  if (!confirm('Are you sure you want to delete this sprint?')) return

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/sprints/${sprintId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (response.ok) {
      await fetchSprints()
      emit('sprintUpdated')
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to delete sprint')
    }
  } catch (error) {
    console.error('Error deleting sprint:', error)
    emit('error', 'Failed to delete sprint')
  }
}

onMounted(() => {
  fetchSprints()
})
</script>
