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

<script>
export default {
  name: 'VerifyEmailView',
  data() {
    return {
      loading: true,
      status: 'pending',
      message: '',
      details: '',
    }
  },
  computed: {
    title() {
      if (this.loading) return 'Verifying email'
      if (this.status === 'success') return 'Email verified'
      if (this.status === 'error') return 'Verification failed'
      return 'Verification status'
    },
    statusIcon() {
      if (this.loading) return 'mdi-email-sync'
      if (this.status === 'success') return 'mdi-check-circle'
      if (this.status === 'error') return 'mdi-alert-circle'
      return 'mdi-email-sync-outline'
    },
    iconColor() {
      if (this.status === 'success') return 'success'
      if (this.status === 'error') return 'error'
      return 'primary'
    },
  },
  async mounted() {
    await this.verifyEmail()
  },
  methods: {
    formatDateTime(dateInput) {
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
    },
    async verifyEmail() {
      const token = this.$route.query.token
      if (!token) {
        this.loading = false
        this.status = 'error'
        this.message = 'Verification token is missing. Please use the link from your email.'
        return
      }

      try {
        const PORT = import.meta.env.VITE_API_PORT
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
          this.status = 'success'
          this.message = data.success || 'Your email has been verified successfully.'
          if (data.emailCooldownEndsAt) {
            const formatted = this.formatDateTime(data.emailCooldownEndsAt)
            if (formatted) {
              this.details = `You can update your email address again on ${formatted}.`
            }
          } else {
            this.details = 'For security, you will need to sign in again to continue.'
          }
        } else {
          this.status = 'error'
          this.message = data.error || 'We could not verify your email. The link may have expired.'
          if (data.message && data.message !== data.error) {
            this.details = data.message
          }
        }
      } catch (error) {
        console.log('Error verifying email:', error)
        this.status = 'error'
        this.message = 'Something went wrong while verifying your email. Please try again.'
      } finally {
        this.loading = false
      }
    },
    goToLogin() {
      this.$router.push('/login')
    },
    goToAccount() {
      this.$router.push('/account/personal')
    },
  },
}
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
