<template>
  <v-card>
    <v-card-title>Time Tracking</v-card-title>
    <v-divider />
    <v-card-text>
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model.number="localEstimate"
            label="Estimated Hours"
            type="number"
            variant="outlined"
            min="0"
            step="0.5"
            :disabled="disabled || updatingEstimate"
            @blur="updateEstimate"
            @keydown.enter="updateEstimate"
          >
            <template #append-inner>
              <v-icon>mdi-clock-outline</v-icon>
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            :model-value="loggedHours"
            label="Logged Hours"
            type="number"
            variant="outlined"
            readonly
          >
            <template #append-inner>
              <v-icon>mdi-clock-check</v-icon>
            </template>
          </v-text-field>
        </v-col>
      </v-row>

      <v-progress-linear
        :model-value="progressPercentage"
        :color="progressColor"
        height="20"
        class="mb-4"
      >
        <template #default>
          <strong>{{ progressPercentage }}%</strong>
        </template>
      </v-progress-linear>

      <v-divider class="my-4" />

      <div class="text-subtitle-2 mb-2">Log Time</div>
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model.number="hoursToLog"
            label="Hours to log"
            type="number"
            variant="outlined"
            min="0.1"
            step="0.5"
            :disabled="loggingTime"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-btn
            color="primary"
            block
            :loading="loggingTime"
            :disabled="!hoursToLog || hoursToLog <= 0"
            @click="logTime"
          >
            Log Time
          </v-btn>
        </v-col>
      </v-row>

      <div v-if="estimatedHours > 0" class="mt-4">
        <div class="text-caption text-grey">
          Remaining: {{ remainingHours }}h / {{ estimatedHours }}h
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  taskId: {
    type: String,
    required: true,
  },
  estimatedHours: {
    type: Number,
    default: 0,
  },
  loggedHours: {
    type: Number,
    default: 0,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['timeLogged', 'estimateUpdated', 'error'])

const localEstimate = ref(props.estimatedHours)
const hoursToLog = ref(null)
const loggingTime = ref(false)
const updatingEstimate = ref(false)

watch(
  () => props.estimatedHours,
  (newValue) => {
    localEstimate.value = newValue
  },
)

const progressPercentage = computed(() => {
  if (!props.estimatedHours || props.estimatedHours === 0) return 0
  return Math.min(Math.round((props.loggedHours / props.estimatedHours) * 100), 100)
})

const progressColor = computed(() => {
  const percentage = progressPercentage.value
  if (percentage >= 100) return 'red'
  if (percentage >= 80) return 'orange'
  if (percentage >= 50) return 'blue'
  return 'green'
})

const remainingHours = computed(() => {
  const remaining = props.estimatedHours - props.loggedHours
  return Math.max(remaining, 0).toFixed(1)
})

const updateEstimate = async () => {
  if (localEstimate.value === props.estimatedHours) return

  updatingEstimate.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/tasks/${props.taskId}/estimate`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estimatedHours: localEstimate.value }),
    })

    if (response.ok) {
      emit('estimateUpdated', localEstimate.value)
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to update estimate')
      localEstimate.value = props.estimatedHours // Revert on error
    }
  } catch (error) {
    console.error('Error updating estimate:', error)
    emit('error', 'Failed to update estimate')
    localEstimate.value = props.estimatedHours // Revert on error
  } finally {
    updatingEstimate.value = false
  }
}

const logTime = async () => {
  if (!hoursToLog.value || hoursToLog.value <= 0) return

  loggingTime.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/tasks/${props.taskId}/log-time`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hours: hoursToLog.value }),
    })

    if (response.ok) {
      emit('timeLogged', hoursToLog.value)
      hoursToLog.value = null
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to log time')
    }
  } catch (error) {
    console.error('Error logging time:', error)
    emit('error', 'Failed to log time')
  } finally {
    loggingTime.value = false
  }
}
</script>
