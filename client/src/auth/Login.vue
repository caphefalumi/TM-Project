<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { decodeCredential } from 'vue3-google-login'
import { useAuthStore } from '../stores/auth.js'
import { useComponentCache } from '../composables/useComponentCache.js'
const { clearAllCaches } = useComponentCache()

const router = useRouter()
const authStore = useAuthStore()
// Check if running in Tauri
const isTauri = computed(() => {
  return window.isTauri
})

onMounted(async () => {
  try {
    if (authStore.isLoggedIn && authStore.user) {
      router.push('/home')
      return
    }

    const existingUser = await authStore.ensureUser()
    if (existingUser) {
      router.push('/home')
    }
  } catch (error) {
    console.error('Error checking existing session:', error)
  }
})

const username = ref('')
const password = ref('')
const userEmail = ref('')
const userId = ref('')

const authenticate = ref(false)
const showPassword = ref(false)
const usingOAuthRegister = ref(false)
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const showResendVerification = ref(false)

const sendToHomePage = async () => {
  // Send to home if user already has an account
  // Clear all caches from any previous session before creating new session
  clearAllCaches()
  console.log('[Auth] Cleared all caches before creating new session')

  setTimeout(() => (success.value = 'Creating secure session...'), 500)
  await createRefreshToken()
  await getAccessToHome()
  console.log('User ID:', userId.value)
  console.log('Username:', username.value)
  console.log('Email:', userEmail.value)
  console.log('Authenticate:', authenticate.value)
  if (authenticate.value) {
    authStore.setLoggedIn(true)
    await authStore.fetchUser()

    success.value = 'Session created successfully!'
    setTimeout(() => router.push('/home'), 1500)
  } else {
    error.value = 'Authentication failed. Please try again.'
    success.value = ''
  }
}

function goToRegister() {
  router.push('/register')
}

const goBack = () => {
  router.push('/')
}

const getAccessToHome = async () => {
  // Get access to home page using login-specific validation
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const res = await fetch(`${PORT}/api/auth/login-protected`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      error.value = data.error || 'Access validation failed'
      console.log('Error accessing home:', data.error)
    } else {
      success.value = 'Access to home granted!'
      authenticate.value = true
      console.log('Home Access Data:', data)
    }
  } catch (err) {
    error.value = 'Network error'
  }
}

const createRefreshToken = async () => {
  // Create a refresh token for the user
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const user = {
      userId: userId.value,
      username: username.value,
      email: userEmail.value,
    }
    const res = await fetch(`${PORT}/api/sessions/me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        user: user,
      }),
    })
    const data = await res.json()
    // get refrest token from the response to cookie for later use

    if (!res.ok || data.error) {
      console.alert('Error creating refresh token:', data.error)
    } else {
      console.log('Refresh token created successfully!')
      console.log('Access Token data:', data)
    }
  } catch (err) {
    error.value = 'Network error'
  }
}

const loginUsingLocal = async () => {
  // Login Button logic
  if (!username.value || !password.value) {
    error.value = 'All fields are required'
    return
  }

  isLoading.value = true
  error.value = ''
  success.value = ''
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const res = await fetch(`${PORT}/api/auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      error.value = data.error
      // Show resend verification option if error is about email not verified
      if (data.error && data.error.includes('Email not verified')) {
        showResendVerification.value = true
        userEmail.value = username.value // Store for resend verification
      }
    } else if (data.success) {
      console.log('Local Login Data:', data)
      success.value = data.success
      // Extract user data from response
      if (data.user) {
        userId.value = data.user.userId
        username.value = data.user.username
        userEmail.value = data.user.email
      }
      sendToHomePage()
    }
  } catch (err) {
    error.value = 'Network error'
  } finally {
    isLoading.value = false
  }
}

const loginUsingOAuth = async (response) => {
  // Login with OAuth Button logic
  const validateEmail = async (email) => {
    isLoading.value = true
    error.value = ''
    success.value = ''
    userEmail.value = email
    const PORT = import.meta.env.VITE_API_PORT

    try {
      const res = await fetch(`${PORT}/api/auth/oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
        }),
      })

      if (!res.ok) {
        error.value = res.error || 'Validate email failed'
      } else {
        success.value = 'Authorization completed! Please enter username.'
        const data = await res.json()
        console.log('Data:', data)

        if (data.success === 'register') {
          usingOAuthRegister.value = true
        } else if (data.success === 'login') {
          username.value = data.username
          userId.value = data.userId
          userEmail.value = data.email
          console.log('Existing user, logging in...', data)
          sendToHomePage()
        }
      }
    } catch (err) {
      error.value = 'Network error'
    } finally {
      isLoading.value = false
    }
  }

  try {
    const userData = decodeCredential(response.credential)
    console.log('Handle the userData:', userData)
    if (userData) {
      const userEmail = userData.email
      const userUsername = userData.given_name
      username.value = userUsername // Use as provided by OAuth

      validateEmail(userEmail)
      // API returns Object --> Validate whether this email is registered or not
    } else {
      error.value = 'Authorization failed'
    }
  } catch (error) {
    error.value = error
  }
}

function generateCodeVerifier() {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallenge(verifier) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const bytes = new Uint8Array(buffer)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function loginWithGoogleInTauri() {
  const CLIENT_ID = import.meta.env.VITE_DESKTOP_CLIENT_ID
  const PORT = import.meta.env.VITE_API_PORT
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = Math.random().toString(36).substring(2)

  // Store state and code_verifier on backend for validation
  try {
    await fetch(`${PORT}/api/auth/oauth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, codeVerifier })
    })
  } catch (err) {
    console.error('Failed to store OAuth state:', err)
    error.value = 'Failed to initialize OAuth flow'
    return
  }

  // Use backend as redirect URI - backend will handle the OAuth callback
  const REDIRECT_URI = `${PORT}/api/auth/oauth/callback`
  const SCOPE = 'openid email profile'

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&state=${state}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`

  console.log('Auth URL:', authUrl)
  // Open browser for login - dynamically import Tauri module
  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(authUrl)
    console.log('Opened Google login...')
  } catch (err) {
    console.error('Failed to open browser:', err)
    error.value = 'Failed to open browser for login'
    return
  }

  // Poll backend for OAuth completion
  const maxAttempts = 60 // 2 minutes timeout
  let attempts = 0

  const pollInterval = setInterval(async () => {
    attempts++

    if (attempts > maxAttempts) {
      clearInterval(pollInterval)
      error.value = 'OAuth timeout - please try again'
      return
    }

    try {
      const res = await fetch(`${PORT}/api/auth/oauth/status?state=${state}`)
      const data = await res.json()

      if (data.status === 'completed') {
        clearInterval(pollInterval)

        // Extract user data from completed OAuth flow
        if (data.userEmail) {
          userEmail.value = data.userEmail
          username.value = data.username || ''

          if (data.action === 'register') {
            success.value = 'Authorization completed! Please enter username.'
            usingOAuthRegister.value = true
          } else if (data.action === 'login') {
            userId.value = data.userId
            username.value = data.username
            userEmail.value = data.userEmail
            console.log('Existing user, logging in...', data)
            await sendToHomePage()
          }
        }
      } else if (data.status === 'error') {
        clearInterval(pollInterval)
        error.value = data.message || 'OAuth failed'
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, 2000) // Poll every 2 seconds
}

const registerWithOAuth = async () => {
  // Register with OAuth Button logic
  isLoading.value = true
  error.value = ''
  success.value = ''
  const PORT = import.meta.env.VITE_API_PORT

  try {
    const res = await fetch(`${PORT}/api/auth/google/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value, // Use as entered
        email: userEmail.value,
      }),
    })

    if (!res.ok) {
      error.value = res.error
    } else {
      const data = await res.json()
      console.log('Data:', data)
      if (data.success) {
        success.value = data.success
        userId.value = data.userId
        username.value = data.username
        userEmail.value = data.email
        sendToHomePage()
      } else if (data.error) {
        error.value = data.error
      }
    }
  } catch (err) {
    error.value = 'Network error'
  } finally {
    isLoading.value = false
  }
}

const resendVerificationEmail = async () => {
  isLoading.value = true
  error.value = ''
  success.value = ''
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const res = await fetch(`${PORT}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail.value }),
    })
    const data = await res.json()
    if (res.ok) {
      success.value = data.success
      showResendVerification.value = false
    } else {
      error.value = data.error || 'Failed to resend verification email.'
    }
  } catch (err) {
    error.value = 'Network error'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card id="tour-login-form" class="pa-6" elevation="8">
          <v-card-title class="text-h5 text-center position-relative mb-2">
            <v-btn
              icon
              variant="text"
              @click="goBack"
              class="position-absolute back-button"
              style="left: 0; top: 50%; transform: translateY(-50%)"
            >
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            Login
          </v-card-title>
          <v-card-text>
            <v-form v-if="!usingOAuthRegister" @submit.prevent="loginUsingLocal">
              <v-text-field
                v-model="username"
                label="Username"
                type="text"
                prepend-inner-icon="mdi-account"
                required
                class="mb-4"
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
              />
              <v-btn
                type="submit"
                color="primary"
                block
                class="mb-2"
                :loading="isLoading"
                :disabled="isLoading"
              >
                Login
              </v-btn>
              <v-divider class="my-4">OR</v-divider>
              <!-- Show different button for Tauri vs Web -->
              <GoogleLogin
                v-if="!isTauri"
                class="w-100 oauth-button"
                :callback="loginUsingOAuth"
              >
              </GoogleLogin>
              <v-btn
                v-else
                @click="loginWithGoogleInTauri"
                color="white"
                block
                class="mb-2 oauth-button-tauri"
                prepend-icon="mdi-google"
              >
                Sign in with Google (Opens in Browser)
              </v-btn>
            </v-form>
            <v-form v-else @submit.prevent="registerWithOAuth">
              <v-text-field
                v-model="username"
                label="Username"
                type="text"
                prepend-inner-icon="mdi-account"
                required
                class="mb-4"
              />
              <v-btn
                type="submit"
                color="primary"
                block
                class="mb-2"
                :loading="isLoading"
                :disabled="isLoading"
              >
                Login
              </v-btn>
            </v-form>
            <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" class="mt-2">{{ success }}</v-alert>

            <!-- Resend Verification Email Link -->
            <div v-if="showResendVerification" class="text-center mt-3 mb-2">
              <v-btn
                variant="text"
                color="primary"
                size="small"
                @click="resendVerificationEmail"
              >
                Resend Verification Email
              </v-btn>
            </div>

            <!-- Forgot Password Link -->
            <div class="text-center mt-3 mb-2">
              <v-btn
                variant="text"
                color="primary"
                size="small"
                @click="$router.push('/forgot-password')"
              >
                Forgot Password?
              </v-btn>
            </div>

            <v-row class="mt-2" align="center" justify="space-evenly">
              <v-col class="pa-0 text-right" cols="6">
                <span>Don't have an account?</span>
              </v-col>
              <v-col class="pa-0 text-center" cols="6">
                <v-btn variant="text" color="secondary" @click.prevent="goToRegister"
                  >Sign up</v-btn
                >
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
