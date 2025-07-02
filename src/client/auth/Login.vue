<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { decodeCredential } from 'vue3-google-login'

const router = useRouter()

const username = ref('')
const password = ref('')
const userEmail = ref('')
const userId = ref('')

const authenticate = ref(false)
const showPassword = ref(false)
const usingOAuthRegister = ref(false)
const error = ref('')
const success = ref('')

const sendToHomePage = async () => {
  // Send to home if user already has an account
  setTimeout(() => (success.value = 'Sending to Home page'), 500)
  await getUserId(username.value)
  console.log('User ID:', userId.value)
  await getUserEmail(username.value)
  console.log('User Email:', userEmail.value)
  await createRefreshToken()
  await getAccessToHome()
  //console.log('User ID:', userId.value)
  if(authenticate.value){
    setTimeout(() => router.push('/home'), 1500)
  } else {
    error.value = 'Authentication failed. Please try again.'
  }
}

function goToRegister() {
  router.push('/register')
}

const getUserId = async (name) => {
  // Get user ID from the server
  const PORT = import.meta.env.VITE_API_PORT
  try {
    let param = name.replace(/ /g, '%20') // Encode spaces in username
    if (!param) {
      error.value = 'Username is required'
      return
    }
    const res = await fetch(`http://localhost:${PORT}/api/account/user/${param}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      error.value = data.error
    } else {
      userId.value = data.userId
      success.value = 'User ID retrieved successfully!'
    }
  } catch (err) {
    error.value = 'Network error'
  }
}

const getUserEmail = async (name) => {
  // Get user email from the server
  const PORT = import.meta.env.VITE_API_PORT
  try {
    let param = name.replace(/ /g, '%20') // Encode spaces in username
    if (!param) {
      error.value = 'Username is required'
      return
    }
    const res = await fetch(`http://localhost:${PORT}/api/account/user/${param}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      error.value = data.error
    } else {
      userEmail.value = data.email
      success.value = 'User email retrieved successfully!'
    }
  } catch (err) {
    error.value = 'Network error'
  }
}

const getAccessToHome = async () => {
  // Get access to home page
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const res = await fetch(`http://localhost:${PORT}/api/protected`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      error.value = data.error
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
    const res = await fetch(`http://localhost:${PORT}/api/tokens/refresh`, {
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
      console.log(data)
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

  error.value = ''
  success.value = ''
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const res = await fetch(`http://localhost:${PORT}/api/account/local/login`, {
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
    } else if (data.success) {
      console.log('Local Login Data:', data)
      success.value = data.success
      sendToHomePage()
    }
  } catch (err) {
    error.value = 'Network error'
  }
}

const loginUsingOAuth = (response) => {
  // Login with OAuth Button logic
  const validateEmail = async (email) => {
    error.value = ''
    success.value = ''
    userEmail.value = email
    const PORT = import.meta.env.VITE_API_PORT

    const res = await fetch(`http://localhost:${PORT}/api/account/oauth`, {
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
        sendToHomePage()
      }
    }
  }

  try {
    const userData = decodeCredential(response.credential)
    console.log('Handle the userData:', userData)
    if (userData) {
      const userEmail = userData.email
      const userUsername = userData.given_name
      username.value = userUsername

      validateEmail(userEmail)
      // API returns Object --> Validate whether this email is registered or not
    } else {
      error.value = 'Authorization failed'
    }
  } catch (error) {
    error.value = error
  }
}

const registerWithOAuth = async () => {
  // Register with OAuth Button logic
  error.value = ''
  success.value = ''
  const PORT = import.meta.env.VITE_API_PORT

  const res = await fetch(`http://localhost:${PORT}/api/account/google/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username.value,
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
      sendToHomePage()
    } else if (data.error) {
      error.value = data.error
    }
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="8">
          <v-card-title class="text-h5 text-center">Login</v-card-title>
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
              <v-btn type="submit" color="primary" block class="mb-2">Login</v-btn>
              <v-divider class="my-4">OR</v-divider>
              <GoogleLogin class="w-100 oauth-button" :callback="loginUsingOAuth"></GoogleLogin>
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
              <v-btn type="submit" color="primary" block class="mb-2">Login</v-btn>
            </v-form>
            <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" class="mt-2">{{ success }}</v-alert>
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
