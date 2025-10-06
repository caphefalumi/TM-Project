<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

const teamIdOfTeamsToDelete = ref('') // This will hold the IDs of teams to delete

const setUserFromProps = (userProps) => {
  console.log('User Props:', userProps)
  user.value.userId = userProps.userId
  user.value.username = userProps.username
  user.value.email = userProps.email
}

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  userProps: {
    type: Object,
    required: true,
  },
  teamsThatUserIsAdmin: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits([
  'update:dialog',
  'teams-deleted', // Event to notify parent component that teams have been deleted
])

onMounted(async () => {
  setUserFromProps(props.userProps)
  if (user) {
  } else {
    user.value.username = 'Guest'
    user.value.email = ''
  }
})

const closeDialog = () => {
  setTimeout(() => {
    success.value = false // Reset success state
    error.value = false // Reset error state
    message.value = '' // Clear message
    teamIdOfTeamsToDelete.value = '' // Reset the selected team ID
    loading.value = false // Reset loading state
    emit('update:dialog', false)
  }, 1500) // Optional delay for better UX
}

const deleteTeams = async (teamId) => {
  if (!teamId) {
    error.value = true
    message.value = 'Please select a team to delete.'
    return
  }

  loading.value = true // Set loading state
  try {
    // Logic to delete teams goes here
    // For example, you might call an API endpoint to delete the selected teams
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: sends refresh token cookie
      body: JSON.stringify({
        teamId: teamId,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      error.value = true
      success.value = false
      message.value = result.message || 'Failed to delete team'
      loading.value = false // Reset loading state on error
      throw new Error('Network response was not ok')
    }
    // Emit an event to notify parent component that teams have been deleted
    teamIdOfTeamsToDelete.value = '' // Reset the selected team ID
    console.log('Team deleted successfully:', result)
    success.value = true
    error.value = false
    message.value = 'Team deleted successfully!'
    closeDialog()
  } catch (error) {
    loading.value = false // Reset loading state on error
    console.log('Failed to delete teams:', error)
  }
}
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        Delete Teams
      </v-card-title>
      <v-card-text>
        <v-select
          v-model="teamIdOfTeamsToDelete"
          :items="props.teamsThatUserIsAdmin"
          label="Select Teams to Delete"
          item-label="title"
          item-value="teamId"
          variant="outlined"
        ></v-select>
      </v-card-text>

      <v-card-text class="text-center">
        <p class="font-weight-bold">This action cannot be undone.</p>
      </v-card-text>
      <v-card-text>
        <v-alert v-if="success" type="success">{{ message }}</v-alert>
        <v-alert v-if="error" type="error">{{ message }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="emit('update:dialog', false)" variant="outlined" :disabled="loading"
          >Cancel</v-btn
        >
        <v-btn
          color="primary"
          @click="deleteTeams(teamIdOfTeamsToDelete)"
          variant="outlined"
          :disabled="loading"
          :loading="loading"
          >Delete</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
