<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12">
          <v-card-title class="text-center py-6">
            <h2 class="text-h4 font-weight-bold primary--text">
              <v-icon class="mr-2" color="primary">mdi-lock-reset</v-icon>
              Reset Password
            </h2>
          </v-card-title>
          <v-card-text>
            <div v-if="error" class="text-center py-8">
              <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
              <h3 class="text-h5 mb-2 text-error">Invalid token</h3>
              <p class="text-body-1 text-medium-emphasis">
                The reset link is invalid or has expired. Please request a new password reset.
              </p>
            </div>

            <div v-else-if="success" class="text-center py-8">
              <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
              <h3 class="text-h5 mb-2 text-success">Password Reset Successful!</h3>
              <p class="text-body-1 text-medium-emphasis">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </div>

            <v-form v-else @submit.prevent="handleResetPassword" v-model="formValid">
              <p class="text-body-1 mb-4 text-center">Enter your new password below.</p>

              <v-text-field
                v-model="password"
                label="New Password"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                class="mb-3"
                :rules="passwordRules"
                required
                :disabled="loading"
                hint="Password must be at least 8 characters long"
                persistent-hint
              ></v-text-field>

              <v-text-field
                v-model="confirmPassword"
                label="Confirm New Password"
                :type="showConfirmPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-check"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                variant="outlined"
                class="mb-3"
                :rules="confirmPasswordRules"
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
                <v-icon start>mdi-check</v-icon>
                Reset Password
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref(false)
const formValid = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const token = ref('')

const passwordRules = [
  (v) => !!v || 'Password is required',
  (v) => v.length >= 8 || 'Password must be at least 8 characters long',
  (v) => /(?=.*[a-z])/.test(v) || 'Password must contain at least one lowercase letter',
  (v) => /(?=.*[A-Z])/.test(v) || 'Password must contain at least one uppercase letter',
  (v) => /(?=.*\d)/.test(v) || 'Password must contain at least one number',
]

const confirmPasswordRules = [
  (v) => !!v || 'Please confirm your password',
  (v) => v === password.value || 'Passwords do not match',
]

onMounted(async () => {
  // Get token from URL query parameters
  token.value = route.query.token

  if (!token.value) {
    error.value = true
    return
  }

  // Verify the token with the server
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: token.value }),
    })

    if (!response.ok) {
      error.value = true
    }
  } catch (err) {
    console.log('Token verification error:', err)
    error.value = true
  }
})

const handleResetPassword = async () => {
  if (!formValid.value || !token.value) return

  loading.value = true
  error.value = false
  success.value = false

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.value,
        password: password.value,
      }),
    })

    if (response.ok) {
      success.value = true

      password.value = ''
      confirmPassword.value = ''

      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } else {
      error.value = true
    }
  } catch (err) {
    console.log('Reset password error:', err)
    error.value = true
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
