<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalNotifications } from '../composables/useGlobalNotifications.js'
import '../styles/buttonStyling.css'

const { showSuccess, showError } = useGlobalNotifications()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const categories = ref([])
const emit = defineEmits([
  'update:dialog',
  'team-created', // or 'members-added' for NewMembers
])

const newTeam = ref({
  title: '',
  category: '',
  description: '',
  parentTeamId: '', // Assuming this is optional
  userId: '', // Automatically set userId from user token through props
  username: '', // Automatically set username from user token through props
})

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

const setUserFromProps = (userProps) => {
  console.log('User Props:', userProps)
  user.value.userId = userProps.userId
  user.value.username = userProps.username
  user.value.email = userProps.email
}

onMounted(async () => {
  setUserFromProps(props.userProps)
  newTeam.value.userId = user.value.userId
  newTeam.value.username = user.value.username
  await fetchCategories()
  console.log('Team that user is admin:', props.teamsThatUserIsAdmin)
  if (user) {
  } else {
    user.value.username = 'Guest'
    user.value.email = ''
  }
})

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

// Computed property to add "None" option to parent team selection
const fetchCategories = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    categories.value = await response.json()
    //console.log('Fetched categories:', categories.value)
  } catch (error) {
    console.log('Failed to fetch categories:', error)
  }
}

watch(
  () => props.dialog,
  (newVal) => {
    console.log('Dialog prop changed:', newVal)
  },
)

// watch for changes in teamsThatUserIsAdmin prop
watch(
  () => props.teamsThatUserIsAdmin,
  (newVal) => {
    console.log('Teams that user is admin changed:', newVal)
    props.teamsThatUserIsAdmin.value = newVal
  },
)

const closeDialog = () => {
  setTimeout(() => {
    clearTeamData() // Clear the form when dialog is closed
    success.value = false // Reset success state
    error.value = false // Reset error state
    message.value = '' // Clear message
    loading.value = false // Reset loading state
    emit('update:dialog', false)
    emit('team-created')
  }, 1500) // Optional delay for better UX
}

const clearTeamData = () => {
  newTeam.value.title = ''
  newTeam.value.category = ''
  newTeam.value.description = ''
  newTeam.value.parentTeamId = ''
}

const createTeam = async () => {
  if (newTeam.value.title.trim() === '') {
    showError('Project title is required', { title: 'Validation Error' })
    return
  } else if (newTeam.value.category.trim() === '') {
    showError('Category is required', { title: 'Validation Error' })
    return
  } else if (newTeam.value.description.trim().length < 10) {
    showError('Description requires at least 10 characters', { title: 'Validation Error' })
    return
  }

  loading.value = true // Set loading state
  console.log('Creating project with data:', newTeam.value)
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTeam.value),
    })

    if (!response.ok) {
      error.value = true
      success.value = false
      message.value = response.json().message || 'Failed to create project'
      loading.value = false // Reset loading state on error
      throw new Error('Network response was not ok')
    }
    const data = await response.json()

    // Use global notification instead of local state
    showSuccess(`Team "${data.title}" created successfully!`, {
      title: 'Team Created',
    })

    console.log('Project created:', data)
    const newTeamToPushToProps = {
      title: data.title,
      teamId: data.teamId,
    }
    props.teamsThatUserIsAdmin.push(newTeamToPushToProps) // Add the new team to the list of teams that user is admin
    closeDialog()
  } catch (error) {
    loading.value = false // Reset loading state on error
    console.log('Failed to create project:', error)

    // Use global notification for errors
    showError('Failed to create team. Please try again.', {
      title: 'Team Creation Failed',
    })
  }
}
</script>

<template>
  <!-- this component is a popup dialog that allows users to create new team -->
  <!-- Using vuetify 3 -->
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <!-- IMPLEMENT: Set card title to bold style -->
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2"
        >Create New Team</v-card-title
      >
      <v-card-text>
        <v-text-field
          v-model="newTeam.title"
          label="Team Title"
          variant="outlined"
          required
        ></v-text-field>
        <v-textarea
          v-model="newTeam.description"
          label="Description"
          rows="3"
          variant="outlined"
        ></v-textarea>
        <v-expand-transition>
          <v-select
            v-model="newTeam.category"
            :items="categories"
            label="Category"
            variant="outlined"
            required
          ></v-select>
        </v-expand-transition>
        <v-expand-transition v-if="props.teamsThatUserIsAdmin.length > 0">
          <v-select
            v-model="newTeam.parentTeamId"
            :items="props.teamsThatUserIsAdmin"
            item-title="title"
            item-value="teamId"
            label="Parent Team ID (optional)"
            variant="outlined"
            placeholder="Select parent team if applicable"
            clearable
            clear-icon="mdi-close"
          ></v-select>
        </v-expand-transition>
      </v-card-text>
      <!-- Display success/errors here -->
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
          @click="createTeam"
          variant="outlined"
          :disabled="loading"
          :loading="loading"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.black-actions {
  background-color: black !important;
  color: white !important;
}

.black-actions .v-btn {
  color: white !important;
}

.black-actions .v-btn--outlined {
  border-color: white !important;
}
</style>
