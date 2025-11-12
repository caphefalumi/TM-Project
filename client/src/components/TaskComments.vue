<template>
  <v-card>
    <v-card-title>Comments</v-card-title>
    <v-divider />
    <v-card-text>
      <!-- Comment input -->
      <v-textarea
        v-model="newComment"
        label="Add a comment"
        variant="outlined"
        rows="3"
        :disabled="loading"
        @keydown.ctrl.enter="addComment"
      />
      <v-btn color="primary" :loading="loading" @click="addComment" class="mb-4"> Post Comment </v-btn>

      <!-- Comments list -->
      <v-list v-if="comments.length > 0">
        <v-list-item v-for="comment in comments" :key="comment._id" class="mb-2">
          <template #prepend>
            <v-avatar color="primary">
              {{ comment.username.charAt(0).toUpperCase() }}
            </v-avatar>
          </template>
          <v-list-item-title>
            <strong>{{ comment.username }}</strong>
            <span v-if="comment.edited" class="text-caption text-grey ml-2">(edited)</span>
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ formatDate(comment.createdAt) }}
          </v-list-item-subtitle>
          <div class="mt-2">
            <div v-if="editingCommentId !== comment._id">
              {{ comment.comment }}
            </div>
            <v-textarea
              v-else
              v-model="editedCommentText"
              variant="outlined"
              rows="2"
              dense
              @keydown.ctrl.enter="saveEdit(comment._id)"
            />
          </div>
          <template #append v-if="comment.userId === userId">
            <v-btn
              v-if="editingCommentId !== comment._id"
              icon
              size="small"
              variant="text"
              @click="startEdit(comment)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              v-else
              icon
              size="small"
              variant="text"
              color="primary"
              @click="saveEdit(comment._id)"
            >
              <v-icon>mdi-check</v-icon>
            </v-btn>
            <v-btn
              v-if="editingCommentId !== comment._id"
              icon
              size="small"
              variant="text"
              @click="deleteComment(comment._id)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-btn v-else icon size="small" variant="text" @click="cancelEdit">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
      <div v-else class="text-center text-grey py-4">No comments yet. Be the first to comment!</div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  taskId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['commentAdded', 'error'])

const comments = ref([])
const newComment = ref('')
const loading = ref(false)
const editingCommentId = ref(null)
const editedCommentText = ref('')

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const fetchComments = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/comments/tasks/${props.taskId}/comments`, {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      comments.value = data.comments
    }
  } catch (error) {
    console.error('Error fetching comments:', error)
  }
}

const addComment = async () => {
  if (!newComment.value.trim()) return

  loading.value = true
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/comments/tasks/${props.taskId}/comments`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: newComment.value }),
    })

    if (response.ok) {
      newComment.value = ''
      await fetchComments()
      emit('commentAdded')
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to add comment')
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    emit('error', 'Failed to add comment')
  } finally {
    loading.value = false
  }
}

const startEdit = (comment) => {
  editingCommentId.value = comment._id
  editedCommentText.value = comment.comment
}

const cancelEdit = () => {
  editingCommentId.value = null
  editedCommentText.value = ''
}

const saveEdit = async (commentId) => {
  if (!editedCommentText.value.trim()) return

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/comments/comments/${commentId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: editedCommentText.value }),
    })

    if (response.ok) {
      await fetchComments()
      cancelEdit()
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to update comment')
    }
  } catch (error) {
    console.error('Error updating comment:', error)
    emit('error', 'Failed to update comment')
  }
}

const deleteComment = async (commentId) => {
  if (!confirm('Are you sure you want to delete this comment?')) return

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/comments/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (response.ok) {
      await fetchComments()
    } else {
      const error = await response.json()
      emit('error', error.message || 'Failed to delete comment')
    }
  } catch (error) {
    console.error('Error deleting comment:', error)
    emit('error', 'Failed to delete comment')
  }
}

onMounted(() => {
  fetchComments()
})
</script>
