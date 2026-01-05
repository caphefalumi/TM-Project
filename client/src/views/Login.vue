<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useComponentCache } from '../composables/useComponentCache.js'
import { open } from '@tauri-apps/plugin-shell'
import vIconLogin from '../components/vIconLogin.vue'
import { GoogleLogin } from 'vue3-google-login'

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
      return
    }

    // Check for OAuth login data from redirect
    const oauthData = sessionStorage.getItem('oauth_login_data')
    if (oauthData) {
      const data = JSON.parse(oauthData)
      sessionStorage.removeItem('oauth_login_data')

      if (data.action === 'login') {
        userId.value = data.userId
        username.value = data.username
        userEmail.value = data.email
        success.value = 'OAuth login successful!'
        await sendToHomePage()
      } else if (data.action === 'register') {
        usingOAuthRegister.value = true
        userEmail.value = data.email
        username.value = data.username
        success.value = 'Authorization completed! Please enter username.'
      }
    }
  } catch (error) {
    console.log('Error checking existing session:', error)
  }
})

const username = ref('')
const password = ref('')
const userEmail = ref('')
const userId = ref('')

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

  await createRefreshToken()
  authStore.setLoggedIn(true)

  console.log('User ID:', userId.value)
  console.log('Username:', username.value)
  console.log('Email:', userEmail.value)
  await authStore.fetchUser()
  success.value = 'Session created successfully!'
  router.push('/home')
}

function goToRegister() {
  router.push('/register')
}

const goBack = () => {
  router.push('/')
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
    error.value = err
  } finally {
    isLoading.value = false
  }
}

const loginUsingOAuth = async (response) => {
  console.log('OAuth Response:', response)
  // Login with OAuth Button logic
  isLoading.value = true
  error.value = ''
  success.value = ''
  try {
    // Use the access_token from the OAuth response
    const res = await fetch(`${import.meta.env.VITE_API_PORT}/api/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        token: response.access_token,
      }),
    })
    const data = await res.json()
    if (data.success === 'register') {
      oauthToken.value = response.access_token
      userEmail.value = data.email
      username.value = data.username || ''
      usingOAuthRegister.value = true
      success.value = 'Authorization completed! Please enter username.'
    } else if (data.success === 'login') {
      username.value = data.username
      userId.value = data.userId
      userEmail.value = data.email
      console.log('Existing user, logging in...', data)
      sendToHomePage()
    } else if (data.error) {
      error.value = data.error
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'OAuth login failed'
  } finally {
    isLoading.value = false
  }
}

// PKCE helper functions
const generateCodeVerifier = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

const generateCodeChallenge = async (codeVerifier) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

const loginWithGoogleInTauri = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    const CLIENT_ID = import.meta.env.VITE_DESKTOP_CLIENT_ID

    if (!CLIENT_ID) {
      throw new Error('Desktop OAuth client ID not configured')
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    // Build OAuth URL for authorization code flow with PKCE
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', 'http://localhost:1409/oauth/callback')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'email profile openid')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    authUrl.searchParams.set('prompt', 'select_account')

    console.log('[OAuth] Starting OAuth flow...')
    success.value = 'Opening browser for authentication...'

    // Open browser
    await open(authUrl.toString())

    // Import Tauri invoke function
    const { invoke } = await import('@tauri-apps/api/core')

    // Wait for OAuth callback using Tauri command
    const result = await invoke('wait_for_oauth_callback', {
      codeVerifier: codeVerifier,
      expectedState: state,
      backendUrl: import.meta.env.VITE_API_PORT,
      clientId: CLIENT_ID,
      clientSecret: import.meta.env.VITE_DESKTOP_CLIENT_SECRET,
    })

    console.log('[OAuth] Received result:', result)

    if (result.success === 'login') {
      userId.value = result.userId
      username.value = result.username
      userEmail.value = result.email
      success.value = 'OAuth login successful!'
      await sendToHomePage()
    } else if (result.success === 'register') {
      // Store OAuth token for registration
      oauthToken.value = result.token || ''
      userEmail.value = result.email
      username.value = result.username || ''
      usingOAuthRegister.value = true
      success.value = 'Authorization completed! Please enter username.'
    } else {
      error.value = result.error || 'OAuth authentication failed'
    }
  } catch (err) {
    console.log('[OAuth] Error:', err)
    error.value = err
  } finally {
    isLoading.value = false
  }
}

// Store OAuth token for registration
const oauthToken = ref('')

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
        username: username.value,
        token: oauthToken.value,
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
        <v-card class="pa-6" elevation="8">
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
                required
                class="mb-4"
              >
                <template #append-inner>
                  <v-icon
                    :icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                    role="button"
                  />
                </template>
              </v-text-field>
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
                auto-login
                popup-type="TOKEN"
              >
                <v-icon-login provider="google" />
              </GoogleLogin>
              <v-icon-login v-else provider="google" @click="loginWithGoogleInTauri" />
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
              <v-btn variant="text" color="primary" size="small" @click="resendVerificationEmail">
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
