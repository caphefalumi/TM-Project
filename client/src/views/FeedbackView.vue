<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <v-row class="align-center mb-6">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold">Feedback</h1>
        <p class="text-h6 text-grey">
          Share your thoughts and help us improve
          <span v-if="user.username" class="text-primary">, {{ user.username }}</span>
        </p>
      </v-col>
      <v-col cols="12" md="4" class="text-right">
        <v-btn @click="handleRefresh" color="primary" size="large" variant="outlined">
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <v-card class="mx-auto" max-width="500">
      <v-card-title class="text-h5 text-center f-bold">Feedback Form</v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <div class="mt-4">
            <div class="text-h6 mb-2">Feature Rating</div>
            <div class="rating-container">
              <v-rating
                v-model="feedback.featureRating"
                length="5"
                background-color="grey lighten-1"
                active-color="yellow darken-3"
                hover
                size="large"
                class="full-width-rating"
                @update:model-value="updateFeatureRatingMessage"
                required
              >
              </v-rating>
            </div>
            <div class="text-body-2 text-grey mt-1 text-center" style="min-height: 20px">
              {{ featureRatingMessage }}
            </div>
          </div>
          <div class="mt-4">
            <div class="text-h6 mb-2">Performance Rating</div>
            <div class="rating-container">
              <v-rating
                v-model="feedback.perfRating"
                length="5"
                background-color="grey lighten-1"
                active-color="yellow darken-3"
                hover
                size="large"
                class="full-width-rating"
                @update:model-value="updatePerfRatingMessage"
                required
              >
              </v-rating>
            </div>
            <div class="text-body-2 text-grey mt-1 text-center" style="min-height: 20px">
              {{ perfRatingMessage }}
            </div>
          </div>
          <div class="mt-4">
            <div class="text-h6 mb-2">User Interface Rating</div>
            <div class="rating-container">
              <v-rating
                v-model="feedback.uiRating"
                length="5"
                background-color="grey lighten-1"
                active-color="yellow darken-3"
                hover
                size="large"
                class="full-width-rating"
                @update:model-value="updateUiRatingMessage"
                required
              >
              </v-rating>
            </div>
            <div class="text-body-2 text-grey mt-1 text-center" style="min-height: 20px">
              {{ uiRatingMessage }}
            </div>
          </div>
          <div class="mt-4">
            <v-textarea
              label="Message"
              v-model="feedback.message"
              placeholder="Enter your feedback here..."
              variant="outlined"
              required
            ></v-textarea>
            <v-select
              label="General Experience"
              :items="generalExperience"
              v-model="feedback.experience"
              variant="outlined"
              required
            ></v-select>
          </div>
        </v-form>

        <!-- Alert Messages -->
        <v-alert
          v-if="showAlert"
          :type="alertType"
          :model-value="showAlert"
          closable
          @click:close="showAlert = false"
          class="mt-4"
        >
          {{ alertMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :disabled="!valid || loading"
          :loading="loading"
          @click="submitFeedback"
          variant="outlined"
        >
          Submit Feedback
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useComponentCache } from '../composables/useComponentCache.js'
import { useAuthStore } from '../stores/auth.js'

// Define component name for keep-alive
defineOptions({
  name: 'FeedbackView',
})

const authStore = useAuthStore()
const { needsRefresh, markAsRefreshed } = useComponentCache()
const router = useRouter()

const valid = ref(false)
const loading = ref(false)
const showAlert = ref(false)
const alertType = ref('success')
const alertMessage = ref('')
const user = ref({
  userId: '',
  username: '',
  email: '',
})
const generalExperience = ['Very bad', 'Bad', 'Average', 'Good', 'Excellent']
const feedback = ref({
  message: '',
  experience: '',
  featureRating: 1,
  perfRating: 1,
  uiRating: 1,
})

// Rating messages for hover/display
const ratingMessages = {
  1: 'Very bad',
  2: 'Bad',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
}

// Reactive rating message states
const featureRatingMessage = ref('')
const perfRatingMessage = ref('')
const uiRatingMessage = ref('')

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const resetForm = () => {
  feedback.value = { message: '', experience: '', featureRating: 1, perfRating: 1, uiRating: 1 }
  valid.value = false
  // Reset rating messages
  featureRatingMessage.value = ratingMessages[1]
  perfRatingMessage.value = ratingMessages[1]
  uiRatingMessage.value = ratingMessages[1]
}

const showAlertMessage = (type, message) => {
  alertType.value = type
  alertMessage.value = message
  showAlert.value = true
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      showAlert.value = false
    }, 5000)
  }
}

// Update rating messages when ratings change
const updateFeatureRatingMessage = (rating) => {
  featureRatingMessage.value = ratingMessages[rating] || ''
}

const updatePerfRatingMessage = (rating) => {
  perfRatingMessage.value = ratingMessages[rating] || ''
}

const updateUiRatingMessage = (rating) => {
  uiRatingMessage.value = ratingMessages[rating] || ''
}

const submitFeedback = async () => {
  if (!user.value.userId) {
    showAlertMessage('error', 'User not authenticated. Please log in again.')
    setTimeout(() => {
      router.push('/login')
    }, 2000)
    return
  }

  loading.value = true
  showAlert.value = false // Hide any previous alerts
  const PORT = import.meta.env.VITE_API_PORT
  try {
    // Include userId in the feedback submission
    const feedbackData = {
      ...feedback.value,
      userId: user.value.userId,
      issue: feedback.value.experience, // Map experience to issue field for backend compatibility
    }

    const res = await fetch(`${PORT}/api/ratings`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Failed to submit feedback')
    }

    const result = await res.json()
    resetForm()
    showAlertMessage('success', result.success || 'Feedback submitted successfully!')
  } catch (err) {
    console.log('Error submitting feedback:', err)
    showAlertMessage('error', err.message)
  } finally {
    loading.value = false
  }
}

// Initialize user data
onMounted(async () => {
  const userToken = await authStore.getUserByAccessToken()
  if (userToken) {
    setUserToUserToken(userToken)
  } else {
    console.log('No user token found, redirecting to login')
    router.push('/login')
  }

  // Initialize rating messages
  featureRatingMessage.value = ratingMessages[feedback.value.featureRating]
  perfRatingMessage.value = ratingMessages[feedback.value.perfRating]
  uiRatingMessage.value = ratingMessages[feedback.value.uiRating]
})

// Refresh handler that works with cache system
const handleRefresh = () => {
  resetForm()
}

// Handle component reactivation when navigating back
onActivated(async () => {
  console.log('FeedbackView: Component reactivated (keep-alive working!)')
  if (needsRefresh('FeedbackView')) {
    console.log('🔃 FeedbackView: Refreshing form due to explicit refresh request')
    resetForm()
    markAsRefreshed('FeedbackView')
  } else {
    console.log('FeedbackView: Using cached form data (no refresh needed)')
  }

  // Ensure user is still authenticated when component is reactivated
  if (!user.value.userId) {
    const userToken = await authStore.getUserByAccessToken()
    if (userToken) {
      setUserToUserToken(userToken)
    } else {
      console.log('User authentication lost, redirecting to login')
      router.push('/login')
    }
  }
})
</script>

<style scoped>
.v-rating {
  font-size: 2rem;
}

.f-bold {
  font-weight: bold;
}

.f-light {
  font-weight: lighter;
}

/* Full width rating container */
.rating-container {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Full width rating styles */
.full-width-rating {
  width: 100% !important;
  display: flex !important;
  justify-content: space-between !important;
}

:deep(.full-width-rating .v-rating__wrapper) {
  width: 100% !important;
  display: flex !important;
  justify-content: space-between !important;
}

:deep(.full-width-rating .v-icon) {
  flex: 1;
  max-width: none !important;
  margin: 0 !important;
}

/* Rating message styling */
.text-body-2 {
  font-weight: 500;
  transition: all 0.3s ease;
}

/* Rating container spacing */
.mt-4 {
  margin-bottom: 8px;
}

/* Make rating stars more prominent */
:deep(.v-rating .v-icon) {
  transition: all 0.2s ease;
}

:deep(.v-rating .v-icon:hover) {
  transform: scale(1.1);
}

/* Rating message animation */
.text-grey {
  opacity: 0.8;
}
</style>
