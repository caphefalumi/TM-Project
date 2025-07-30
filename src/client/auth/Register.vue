<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const success = ref('')
const loading = ref(false)
const router = useRouter()

async function register() {
  
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    // Send registration data to backend API (adjust URL as needed)
    const PORT = import.meta.env.VITE_API_PORT;
    const res = await fetch(`${PORT}/api/account/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Registration failed'
    } else {
      success.value = 'Registration successful!'
      // Optionally redirect to login after registration
      setTimeout(() => router.push('/'), 1500)
    }
  } catch (e) {
    error.value = 'Network error'
  }
  loading.value = false
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="8">
          <v-card-title class="text-h5 text-center mb-2">Register</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="register">
              <v-text-field
                v-model="username"
                label="Username"
                type="text"
                prepend-inner-icon="mdi-account"
                required
                class="mb-4"
                :rules="[
                  v => !!v || 'Username is required',
                  v => v.length >= 3 || 'Username must be at least 3 characters'
                ]"
              />
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                prepend-inner-icon="mdi-email"
                required
                class="mb-4"
                :rules="[
                  v => !!v || 'Email is required',
                  v => /.+@.+\..+/.test(v) || 'E-mail must be valid'
                ]"
              />
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Password"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                required
                class="mb-4"
                :rules="[
                  v => !!v || 'Password is required',
                  v => v.length >= 6 || 'Password must be at least 6 characters'
                ]"
              />
              <v-btn :loading="loading" type="submit" color="primary" block class="mb-2">Register</v-btn>
            </v-form>
            <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" class="mt-2">{{ success }}</v-alert>
            <v-row class="mt-2" align="center" justify="space-evenly">
              <v-col class="pa-0 text-right" cols="6">
                <span>Already have an account?</span>
              </v-col>
              <v-col class="pa-0 text-center" cols="6">
                <v-btn variant="text" color="secondary" @click="router.push('/login')">Login</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>