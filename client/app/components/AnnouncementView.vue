<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)
const commentsLoading = ref(false)
const submittingComment = ref(false)

const emit = defineEmits(['update:dialog', 'announcement-updated'])

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

// Comment form data
const newComment = ref({
  content: '',
  replyTo: '', // For nested replies
})

// Comments data
const comments = ref([])

// Watch for changes in the announcement prop to fetch comments
watch(
  () => props.announcement,
  (newAnnouncement) => {
    if (newAnnouncement && newAnnouncement._id) {
      console.log('Announcement updated, fetching comments...')
      fetchComments()
    }
  },
)

onMounted(() => {
  // Initial fetch of comments when component mounts
  if (props.announcement && props.announcement._id) {
    fetchComments()
  }
})

// Fetch comments for the announcement
const fetchComments = () => {
  console.log('Fetching comments for announcement:', props.announcement.comments)
  if (props.announcement.comments && Array.isArray(props.announcement.comments)) {
    comments.value = props.announcement.comments || []
  }
}

// Submit a new comment
const submitComment = async () => {
  if (!newComment.value.content.trim()) {
    error.value = true
    message.value = 'Comment content cannot be empty'
    return
  }

  submittingComment.value = true
  error.value = false

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const commentData = {
      userId: props.userProps.userId,
      username: props.userProps.username,
      content: newComment.value.content,
      replyTo: newComment.value.replyTo || '',
    }

    const response = await fetch(`${PORT}/api/announcements/${props.announcement._id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: sends refresh token cookie
      body: JSON.stringify(commentData),
    })

    const result = await response.json()
    if (response.ok) {
      success.value = true
      message.value = 'Comment added successfully!'

      // Reset form
      newComment.value.content = ''
      newComment.value.replyTo = ''

      // Refresh comments
      emit('announcement-updated')
      // Soft update comments
      comments.value.push({
        ...commentData,
        _id: result.comment._id, // Assuming the API returns the new comment ID
        createdAt: new Date().toISOString(), // Set current time as createdAt
      })
      // Clear success message after delay
      setTimeout(() => {
        success.value = false
        message.value = ''
      }, 1250)
      await fetchComments()
    } else {
      error.value = true
      success.value = false
      message.value = result.message || 'Failed to add comment'
      throw new Error(result.message || 'Failed to add comment')
    }
  } catch (err) {
    console.log('Error submitting comment:', err)
    error.value = true
    message.value = err.message || 'Failed to add comment'
  } finally {
    submittingComment.value = false
  }
}

// Reply to a specific comment
const replyToComment = (comment) => {
  newComment.value.replyTo = comment._id
  // Focus on the comment input (you can add ref for this)
}

const getReplyUsername = (commentId) => {
  return comments.value.find((comment) => comment._id === commentId)?.username || ''
  // Focus on the comment input (you can add ref for this)
}

// Cancel reply
const cancelReply = () => {
  newComment.value.replyTo = null
}

// Close dialog
const closeDialog = () => {
  // Reset state
  newComment.value.content = ''
  newComment.value.replyTo = null
  success.value = false
  error.value = false
  message.value = ''

  emit('update:dialog', false)
}

// Format date for display
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

// Get time ago format
const getTimeAgo = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return `${Math.floor(diffInMinutes / 1440)}d ago`
}

// Group comments by replies
const organizedComments = computed(() => {
  const mainComments = comments.value.filter((comment) => !comment.replyTo)
  const replies = comments.value.filter((comment) => comment.replyTo)
  const result = mainComments.map((comment) => ({
    ...comment,
    replies: replies.filter((reply) => reply.replyTo === comment._id),
  }))
  console.log('Organized Comments:', result)
  return result
})
</script>

<template>
  <v-dialog
    :model-value="props.dialog"
    @update:model-value="closeDialog"
    max-width="800px"
    persistent
    scrollable
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="text-h5 pa-4 font-weight-bold d-flex align-center">
        <v-btn icon @click="closeDialog" variant="text" class="mr-2">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <span class="flex-grow-1">{{ props.announcement.title }}</span>
      </v-card-title>

      <v-card-text class="pa-0" v-if="props.announcement">
        <!-- Announcement Content -->
        <div class="pa-4 border-bottom">
          <div class="mb-3">
            <div class="d-flex align-center mb-2">
              <v-avatar size="32" color="primary" class="mr-2">
                <span class="text-white">{{
                  props.announcement.createdByUsername?.[0]?.toUpperCase()
                }}</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ props.announcement.createdByUsername }}</div>
                <div class="text-caption text-grey">
                  {{ formatDate(props.announcement.updatedAt) }}
                </div>
              </div>
            </div>

            <h3 class="text-h6 mb-2">{{ props.announcement.title }}</h3>
            <p v-if="props.announcement.subtitle" class="text-subtitle-1 text-grey mb-2">
              {{ props.announcement.subtitle }}
            </p>
            <div class="text-body-1">{{ props.announcement.content }}</div>
          </div>
        </div>

        <!-- Comments Section -->
        <div class="pa-4">
          <div class="d-flex align-center justify-space-between mb-4">
            <h4 class="text-h6">Comments ({{ comments.length }})</h4>
            <v-btn v-if="commentsLoading" variant="text" size="small" :loading="true">
              Loading...
            </v-btn>
          </div>

          <!-- Alert Messages -->
          <v-alert v-if="success" type="success" variant="tonal" class="mb-4" closable>
            {{ message }}
          </v-alert>
          <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable>
            {{ message }}
          </v-alert>

          <!-- Reply indicator -->
          <v-card v-if="newComment.replyTo" variant="outlined" class="mb-4 pa-3">
            <div class="d-flex align-center justify-space-between">
              <div class="text-caption">
                <v-icon size="small" class="mr-1">mdi-reply</v-icon>
                Replying to <strong>{{ getReplyUsername(newComment.replyTo) }}</strong>
              </div>
              <v-btn icon size="small" @click="cancelReply">
                <v-icon size="small">mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card>

          <!-- Add Comment Form -->
          <v-card variant="outlined" class="mb-4">
            <v-card-text>
              <v-textarea
                v-model="newComment.content"
                label="Add a comment..."
                variant="outlined"
                rows="3"
                :disabled="loading"
              ></v-textarea>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                v-if="newComment.replyTo"
                variant="text"
                @click="cancelReply"
                :disabled="submittingComment"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                @click="submitComment"
                :loading="submittingComment"
                :disabled="!newComment.content.trim() || submittingComment"
              >
                {{ newComment.replyTo ? 'Reply' : 'Comment' }}
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Comments List -->
          <div v-if="commentsLoading" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-2">Loading comments...</p>
          </div>

          <div v-else-if="organizedComments.length === 0" class="text-center pa-4">
            <v-icon size="48" color="grey">mdi-comment-outline</v-icon>
            <p class="text-grey mt-2">No comments yet. Be the first to comment!</p>
          </div>

          <div v-else>
            <!-- Main Comments -->
            <div v-for="comment in organizedComments" :key="comment._id" class="mb-4">
              <!-- Main Comment -->
              <v-card variant="outlined" class="mb-2">
                <v-card-text class="pb-2">
                  <div class="d-flex align-center mb-2">
                    <v-avatar size="28" color="primary" class="mr-2">
                      <span class="text-white text-caption">{{
                        comment.username?.[0]?.toUpperCase()
                      }}</span>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <span class="font-weight-medium">{{ comment.username }}</span>
                      <span class="text-caption text-grey ml-2">{{
                        getTimeAgo(comment.createdAt)
                      }}</span>
                    </div>
                    <v-btn icon size="small" variant="text" @click="replyToComment(comment)">
                      <v-icon size="small">mdi-reply</v-icon>
                    </v-btn>
                  </div>
                  <div class="text-body-2">{{ comment.content }}</div>
                </v-card-text>
              </v-card>

              <!-- Replies -->
              <div v-if="comment.replies && comment.replies.length > 0" class="ml-8">
                <v-card
                  v-for="reply in comment.replies"
                  :key="reply._id"
                  variant="outlined"
                  class="mb-2"
                >
                  <v-card-text class="pb-2">
                    <div class="d-flex align-center mb-2">
                      <v-icon size="small" class="mr-2 text-grey">mdi-reply</v-icon>
                      <v-avatar size="24" color="secondary" class="mr-2">
                        <span class="text-white text-caption">{{
                          reply.username?.[0]?.toUpperCase()
                        }}</span>
                      </v-avatar>
                      <div>
                        <span class="font-weight-medium">{{ reply.username }}</span>
                        <span class="text-caption text-grey ml-2">{{
                          getTimeAgo(reply.createdAt)
                        }}</span>
                      </div>
                    </div>
                    <div class="text-body-2">{{ reply.content }}</div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
