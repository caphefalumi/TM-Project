<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12">
          <v-card-title class="text-center py-6">
            <h2 class="text-h4 font-weight-bold primary--text">
              <v-icon class="mr-2" color="primary">mdi-lock-reset</v-icon>
              Forgot Password
            </h2>
          </v-card-title>

          <v-card-text>
            <v-alert
              v-if="success"
              type="success"
              class="mb-4"
              closable
              @click:close="success = false"
            >
              {{ message }}
            </v-alert>
            <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = false">
              {{ message }}
            </v-alert>

            <v-form @submit.prevent="handleForgotPassword" v-model="formValid">
              <p class="text-body-1 mb-4 text-center">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <v-alert
                type="info"
                class="mb-4"
                border="start"
                color="primary"
                icon="mdi-information"
              >
                If you reset your password, all sessions will be logged out for your account.
              </v-alert>

              <v-text-field
                v-model="email"
                label="Email Address"
                type="email"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                class="mb-3"
                :rules="emailRules"
                required
                :disabled="loading"
              ></v-text-field>

              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                class="mb-3"
                :loading="loading"
                :disabled="!formValid || loading"
              >
                <v-icon start>mdi-send</v-icon>
                Send Reset Link
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center pb-6">
            <v-btn to="/login" variant="text" color="primary">
              <v-icon start>mdi-arrow-left</v-icon>
              Back to Login
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Reactive state
const email = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref(false)
const message = ref('')
const formValid = ref(false)

// Validation rules
const emailRules = [
  (v) => !!v || 'Email is required',
  (v) => /.+@.+\..+/.test(v) || 'Email must be valid',
]

const handleForgotPassword = async () => {
  if (!formValid.value) return

  loading.value = true
  error.value = false
  success.value = false

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.value }),
    })

    const data = await response.json()

    if (response.ok) {
      success.value = true
      message.value = data.message || 'Password reset link has been sent to your email'

      // Optionally redirect to login after a delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } else {
      error.value = true
      message.value = data.message || 'Failed to send reset link'
    }
  } catch (err) {
    console.log('Forgot password error:', err)
    error.value = true
    message.value = 'Network error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.v-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.primary--text {
  color: #1976d2 !important;
}
</style>
