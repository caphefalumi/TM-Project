<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

const titleField = ref('')
const subtitleField = ref('')
const announcementContent = ref('')

const emit = defineEmits(['update:dialog', 'announcement-created'])

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  userProps: {
    type: Object,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  announcements: {
    type: Array,
    required: true,
  },
})

const createAnnouncement = async () => {
  if (!titleField.value || !announcementContent.value) {
    error.value = true
    success.value = false
    message.value = 'Title and Content are required fields.'
    return
  }
  if (titleField.value.length > 100) {
    error.value = true
    success.value = false
    message.value = 'Title must be less than 100 characters.'
    return
  }
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${props.teamId}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title: titleField.value,
        subtitle: subtitleField.value,
        content: announcementContent.value,
        createdBy: props.userProps.userId,
        createdByUsername: props.userProps.username,
      }),
    })

    if (response.ok) {
      titleField.value = ''
      subtitleField.value = ''
      announcementContent.value = ''
      success.value = true
      error.value = false
      message.value = 'Announcement created successfully!'
      loading.value = false // Reset loading state
      emit('announcement-created') // Emit event to notify parent component
      closeDialog() // Close dialog after a short delay
    } else {
      const errorData = await response.json()
      console.log('Error creating announcement:', errorData)
    }
  } catch (error) {
    console.log('Error creating announcement:', error)
    console.log('Failed to create announcement. Please try again later.')
  }
}

const closeDialog = () => {
  setTimeout(() => {
    clearAnnouncementData() // Clear the form when dialog is closed
    success.value = false // Reset success state
    error.value = false // Reset error state
    message.value = '' // Clear message
    loading.value = false // Reset loading state
    emit('update:dialog', false)
  }, 1500) // Optional delay for better UX
}

const clearAnnouncementData = () => {
  titleField.value = ''
  subtitleField.value = ''
  announcementContent.value = ''
}
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        New Announcements
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="titleField" label="Title" variant="outlined" required>
        </v-text-field>
        <v-text-field v-model="subtitleField" label="Subtitle (optional)" variant="outlined">
        </v-text-field>
        <v-textarea
          v-model="announcementContent"
          label="Content"
          rows="4"
          variant="outlined"
          required
        ></v-textarea>
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
          variant="outlined"
          @click="createAnnouncement"
          :disabled="loading"
          :loading="loading"
          >Create Announcement</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
