<script setup>
import { ref, onMounted, watch } from 'vue'

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

const emit = defineEmits(['update:dialog', 'announcement-updated'])

const titleField = ref('')
const subtitleField = ref('')
const announcementContent = ref('')

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
  announcement: {
    type: Object,
    required: true,
  },
})

const updateFields = () => {
  titleField.value = props.announcement.title || ''
  subtitleField.value = props.announcement.subtitle || ''
  announcementContent.value = props.announcement.content || ''
}

onMounted(() => {
  updateFields()
})

// Watch for changes in the announcement prop to update fields
watch(
  () => props.announcement,
  (newAnnouncement) => {
    if (newAnnouncement) {
      titleField.value = newAnnouncement.title || ''
      subtitleField.value = newAnnouncement.subtitle || ''
      announcementContent.value = newAnnouncement.content || ''
    }
  },
  { immediate: true },
)

const updateAnnouncement = async () => {
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
  loading.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/announcements/${props.announcement._id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: props.announcement._id,
          title: titleField.value,
          subtitle: subtitleField.value,
          content: announcementContent.value,
          createdBy: props.userProps.userId,
          createdByUsername: props.userProps.username,
        }),
      },
    )
    const data = await response.json()
    console.log('Update response:', data) // Add debugging
    if (response.ok) {
      success.value = true
      error.value = false
      message.value = data.message || 'Announcement updated successfully.'
      emit('announcement-updated')
    } else {
      error.value = true
      success.value = false
      message.value = data.message || 'Failed to update announcement.'
    }
  } catch (err) {
    console.log('Update error:', err) // Add error debugging
    error.value = true
    success.value = false
    message.value = 'An error occurred while updating the announcement.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        Edit Announcement
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="titleField" label="Title" variant="outlined" required></v-text-field>
        <v-text-field
          v-model="subtitleField"
          label="Subtitle (optional)"
          variant="outlined"
        ></v-text-field>
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
          @click="updateAnnouncement"
          :disabled="loading"
          :loading="loading"
          >Update Announcement</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
