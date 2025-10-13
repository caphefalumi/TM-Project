<template>
  <div class="verify-email">
    <div class="verify-card" :class="status">
      <div v-if="loading" class="verify-loading">
        <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
        <p>Verifying your email address...</p>
      </div>
      <template v-else>
        <div class="icon-wrapper" :class="status">
          <v-icon :color="iconColor" size="48">{{ statusIcon }}</v-icon>
        </div>
        <h2>{{ title }}</h2>
        <p class="message">{{ message }}</p>
        <p v-if="details" class="details">{{ details }}</p>
        <div class="actions">
          <button v-if="status === 'success'" class="action primary" @click="goToLogin">
            Sign in
          </button>
          <button v-if="status !== 'pending'" class="action secondary" @click="goToAccount">
            Back to account
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Nuxt page meta
definePageMeta({
  layout: false,
  title: 'Verify Email'
})

// SEO
useHead({
  title: 'Verify Email',
  meta: [
    { name: 'description', content: 'Verify your email address for Teams Management' }
  ]
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

const loading = ref(true)
const status = ref('pending')
const message = ref('')
const details = ref('')

const title = computed(() => {
  if (loading.value) return 'Verifying email'
  if (status.value === 'success') return 'Email verified'
  if (status.value === 'error') return 'Verification failed'
  return 'Verification status'
})

const statusIcon = computed(() => {
  if (loading.value) return 'mdi-email-sync'
  if (status.value === 'success') return 'mdi-check-circle'
  if (status.value === 'error') return 'mdi-alert-circle'
  return 'mdi-email-sync-outline'
})

const iconColor = computed(() => {
  if (status.value === 'success') return 'success'
  if (status.value === 'error') return 'error'
  return 'primary'
})

const formatDateTime = (dateInput) => {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const verifyEmail = async () => {
  const token = route.query.token
  if (!token) {
    loading.value = false
    status.value = 'error'
    message.value = 'Verification token is missing. Please use the link from your email.'
    return
  }

  try {
    const PORT = config.public.apiPort
    const response = await fetch(`${PORT}/api/users/email/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      status.value = 'success'
      message.value = data.success || 'Your email has been verified successfully.'
      if (data.emailCooldownEndsAt) {
        const formatted = formatDateTime(data.emailCooldownEndsAt)
        if (formatted) {
          details.value = `You can update your email address again on ${formatted}.`
        }
      } else {
        details.value = 'For security, you will need to sign in again to continue.'
      }
    } else {
      status.value = 'error'
      message.value = data.error || 'We could not verify your email. The link may have expired.'
      if (data.message && data.message !== data.error) {
        details.value = data.message
      }
    }
  } catch (error) {
    console.log('Error verifying email:', error)
    status.value = 'error'
    message.value = 'Something went wrong while verifying your email. Please try again.'
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

const goToAccount = () => {
  router.push('/account/personal')
}

onMounted(async () => {
  await verifyEmail()
})
</script>

<style scoped>
.verify-email {
  min-height: 100vh;
  background: linear-gradient(135deg, #f4f7ff, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
}

.verify-card {
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  border-radius: 24px;
  padding: 36px 32px;
  box-shadow: 0 24px 60px rgba(20, 32, 84, 0.15);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.verify-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  color: #1f2937;
  font-size: 16px;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  margin: 0 auto;
}

.icon-wrapper.success {
  background: #e6f4ea;
}

.icon-wrapper.error {
  background: #fdecea;
}

.icon-wrapper.pending {
  background: #eef2ff;
}

h2 {
  margin: 0;
  font-size: 26px;
  color: #1f2937;
}

.message {
  margin: 0;
  color: #374151;
  font-size: 16px;
  line-height: 1.5;
}

.details {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.action {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.action.primary {
  background: #4a90e2;
  color: #fff;
  box-shadow: 0 10px 20px rgba(74, 144, 226, 0.25);
}

.action.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(74, 144, 226, 0.3);
}

.action.secondary {
  background: #eef1f7;
  color: #1f2937;
}

.action.secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(30, 41, 59, 0.12);
}

@media (max-width: 600px) {
  .verify-card {
    padding: 28px 24px;
    border-radius: 20px;
  }

  h2 {
    font-size: 22px;
  }

  .actions {
    flex-direction: column;
  }

  .action {
    width: 100%;
  }
}
</style>
