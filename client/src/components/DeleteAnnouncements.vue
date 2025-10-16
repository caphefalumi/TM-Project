<script setup>
import { ref } from 'vue'

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)
const emit = defineEmits(['update:dialog', 'announcement-deleted'])

const deleteAnnouncement = async () => {
  loading.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/announcements/${props.announcementId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: sends refresh token cookie
      },
    )

    const result = await response.json()

    if (!response.ok) {
      error.value = true
      success.value = false
      message.value = result.message || 'Failed to delete announcement.'
      throw new Error('Failed to delete announcement')
    }
    success.value = true
    error.value = false
    message.value = 'Announcement deleted successfully.'
    emit('announcement-deleted')
    setTimeout(() => {
      emit('update:dialog', false)
    }, 1000)
  } catch (err) {
    error.value = true
    message.value = err.message || 'An error occurred while deleting the announcement.'
  } finally {
    loading.value = false
  }
}
const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  announcementId: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        Delete Announcement
      </v-card-title>
      <v-card-text>
        <p class="mb-4">Are you sure you want to delete this announcement?</p>
        <v-alert v-if="success" type="success" class="mb-4" closable>{{ message }}</v-alert>
        <v-alert v-if="error" type="error" class="mb-4" closable>{{ message }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="emit('update:dialog', false)" variant="outlined" :disabled="loading">
          Cancel
        </v-btn>
        <v-btn
          color="error"
          variant="outlined"
          @click="deleteAnnouncement"
          :loading="loading"
          :disabled="loading"
          >Confirm Delete</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
