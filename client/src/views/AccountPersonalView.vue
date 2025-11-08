<template>
  <div class="account-view">
    <div class="container">
      <div class="header">
        <h2>Personal Information</h2>
        <p>Manage your profile and personal settings</p>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <router-link to="/account/personal" class="tab-button active">
          <v-icon class="tab-icon">mdi-account</v-icon>
          Personal
        </router-link>
        <router-link to="/account/security" class="tab-button">
          <v-icon class="tab-icon">mdi-shield-lock</v-icon>
          Security
        </router-link>
      </div>

      <!-- Profile Section -->
      <div class="tab-content profile-section">
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">
              <v-avatar size="80" color="primary">
                <span class="text-h4 text-white">{{ user.username?.[0]?.toUpperCase() }}</span>
              </v-avatar>
            </div>
            <div class="profile-info">
              <div class="profile-title">
                <h3>{{ user.username }}</h3>
                <span v-if="user.email && !user.emailVerified" class="status-chip warning">
                  <v-icon size="16">mdi-clock-outline</v-icon>
                  Verification pending
                </span>
                <span v-else-if="user.email && user.emailVerified" class="status-chip success">
                  <v-icon size="16">mdi-check-circle</v-icon>
                  Verified
                </span>
                <span v-else class="status-chip muted">
                  <v-icon size="16">mdi-information-outline</v-icon>
                  No email
                </span>
              </div>
              <p class="user-id">User ID: {{ user.userId }}</p>
            </div>
          </div>

          <div class="profile-details">
            <h4>Account Information</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Username</label>
                <div class="info-value">
                  {{ user.username }}
                  <button class="edit-inline-btn" @click="openEditUsername" title="Edit Username">
                    <v-icon size="16">mdi-pencil</v-icon>
                  </button>
                </div>
              </div>
              <div class="info-item">
                <label>Email Address</label>
                <div class="info-value">
                  {{ user.email }}
                  <span v-if="!user.email" class="status-chip success subtle">Verified</span>
                  <span v-else class="status-chip warning subtle">Current</span>
                  <button class="edit-inline-btn" @click="openEditEmail" title="Edit Email">
                    <v-icon size="16">mdi-pencil</v-icon>
                  </button>
                </div>
              </div>
              <div class="info-item" v-if="user.email && !user.emailVerified">
                <label>Pending Email</label>
                <div class="info-value pending">
                  {{ user.email }}
                  <span class="status-chip warning subtle">Verification required</span>
                </div>
              </div>
              <div class="info-item">
                <label>Member Since</label>
                <div class="info-value">{{ memberSince }}</div>
              </div>
            </div>
            <div v-if="user.email && !user.emailVerified" class="pending-email-banner">
              <v-icon size="18">mdi-email-clock</v-icon>
              <span>
                We've sent a confirmation email to <strong>{{ user.email }}</strong
                >.
                <span v-if="emailVerificationDeadlineText">
                  Please verify by {{ emailVerificationDeadlineText }}.
                </span>
              </span>
            </div>
            <ul class="cooldown-list">
              <li v-if="usernameCooldownText">
                <v-icon size="18">mdi-calendar-clock</v-icon>
                <span>Your next username change will be available {{ usernameCooldownText }}</span>
              </li>
              <li v-if="emailCooldownText">
                <v-icon size="18">mdi-email-sync-outline</v-icon>
                <span>Your next email change will be available {{ emailCooldownText }}</span>
              </li>
            </ul>
          </div>

          <div class="profile-actions">
            <h4>Profile Actions</h4>
            <div class="actions-grid">
              <button class="action-button secondary" @click="changePassword">
                <v-icon>mdi-lock-reset</v-icon>
                Change Password
              </button>
              <button class="action-button danger" @click="openDeleteAccount">
                <v-icon>mdi-account-remove</v-icon>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Display -->
    <div v-if="message" :class="['message', message.type]">
      {{ message.text }}
    </div>

    <!-- Password Reset Popup -->
    <div v-if="showPasswordResetPopup" class="popup-overlay" @click="closePasswordResetPopup">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Password Reset Email Sent</h3>
          <button class="close-button" @click="closePasswordResetPopup">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content">
          <div class="popup-icon">
            <v-icon size="48" color="success">mdi-email-check</v-icon>
          </div>
          <p class="popup-message">We've sent a password reset link to your email address:</p>
          <p class="email-address">{{ user.email }}</p>
          <p class="popup-instruction">
            Please check your inbox and follow the instructions to reset your password. If you don't
            see the email, check your spam folder.
          </p>
        </div>
        <div class="popup-actions">
          <button class="popup-button primary" @click="closePasswordResetPopup">Got it</button>
        </div>
      </div>
    </div>

    <!-- Password Reset Confirmation Popup -->
    <div v-if="showPasswordResetConfirm" class="popup-overlay" @click="closePasswordResetConfirm">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Confirm Password Reset</h3>
          <button class="close-button" @click="closePasswordResetConfirm">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content">
          <div class="popup-icon">
            <v-icon size="48" color="info">mdi-information</v-icon>
          </div>
          <p class="popup-message">
            If you reset your password, all sessions will be logged out for your account.
          </p>
          <p class="popup-instruction">Do you want to continue?</p>
        </div>
        <div class="popup-actions">
          <button class="popup-button secondary" @click="closePasswordResetConfirm">Cancel</button>
          <button class="popup-button primary" @click="confirmPasswordReset">Continue</button>
        </div>
      </div>
    </div>

    <!-- Username Edit Popup -->
    <div v-if="showEditUsernamePopup" class="popup-overlay" @click="closeEditUsername">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Edit Username</h3>
          <button class="close-button" @click="closeEditUsername">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content epic-edit-container">
          <form @submit.prevent="saveUsername" class="profile-form epic-form">
            <section class="epic-section">
              <div class="section-header">
                <div class="section-icon">
                  <v-icon>mdi-account-edit</v-icon>
                </div>
                <div>
                  <h4>Update your display name</h4>
                  <p>
                    Choose a display name that represents you. Once confirmed, you'll need to wait
                    two weeks to change it again.
                  </p>
                </div>
              </div>
              <div class="epic-body">
                <div class="epic-field">
                  <label class="field-label" for="editUsername">New display name</label>
                  <div class="input-shell">
                    <v-icon class="field-icon" size="20">mdi-account-outline</v-icon>
                    <input
                      id="editUsername"
                      v-model="editUsernameForm.username"
                      type="text"
                      class="form-input"
                      placeholder="Enter new display name"
                      required
                    />
                  </div>
                  <p class="field-helper">
                    Never use personal information such as your real name, address, or phone number.
                  </p>
                </div>
                <ul class="epic-guidelines">
                  <li>
                    <v-icon size="16">mdi-form-textbox</v-icon>Display names must be at least 3
                    characters long.
                  </li>
                  <li>
                    <v-icon size="16">mdi-timer-lock-outline</v-icon>You won't be able to change
                    your display name again for two weeks.
                  </li>
                </ul>
                <label v-if="requiresUsernameAcknowledgement" class="epic-checkbox">
                  <input type="checkbox" v-model="acknowledgements.username" />
                  <span
                    >I understand I can't change my display name again for 2 weeks after this
                    change.</span
                  >
                </label>
              </div>
            </section>
            <div class="popup-actions inline-actions">
              <button type="button" class="popup-button secondary" @click="closeEditUsername">
                Cancel
              </button>
              <button
                type="submit"
                class="popup-button primary"
                :disabled="isSavingUsername || !canSaveUsername"
              >
                {{ isSavingUsername ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Email Edit Popup -->
    <div v-if="showEditEmailPopup" class="popup-overlay" @click="closeEditEmail">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Edit Email</h3>
          <button class="close-button" @click="closeEditEmail">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content epic-edit-container">
          <form @submit.prevent="saveEmail" class="profile-form epic-form">
            <section class="epic-section">
              <div class="section-header">
                <div class="section-icon accent">
                  <v-icon>mdi-email-edit-outline</v-icon>
                </div>
                <div>
                  <h4>Update your email</h4>
                  <p>
                    We'll send a verification link to your new address. You won't be able to update
                    it again for 90 days after verification.
                  </p>
                </div>
              </div>
              <div class="epic-body">
                <div class="epic-field">
                  <label class="field-label" for="editEmail">New email address</label>
                  <div class="input-shell">
                    <v-icon class="field-icon" size="20">mdi-email-outline</v-icon>
                    <input
                      id="editEmail"
                      v-model="editEmailForm.email"
                      type="email"
                      class="form-input"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <p class="field-helper">
                    We'll send a verification message to confirm this change before it's applied.
                  </p>
                </div>
                <div v-if="user.email && !user.emailVerified" class="pending-note">
                  <v-icon size="18">mdi-email-clock-outline</v-icon>
                  <span>
                    A verification email is waiting at <strong>{{ user.email }}</strong
                    >.
                    <span v-if="emailVerificationDeadlineText"
                      >Please verify by {{ emailVerificationDeadlineText }}.</span
                    >
                  </span>
                </div>
                <ul class="epic-guidelines">
                  <li>
                    <v-icon size="16">mdi-shield-check</v-icon>You'll need to verify the new email
                    before it replaces your current one.
                  </li>
                  <li>
                    <v-icon size="16">mdi-timer-sand</v-icon>After verification, you can't change
                    your email again for 90 days.
                  </li>
                </ul>
                <label v-if="requiresEmailAcknowledgement" class="epic-checkbox">
                  <input type="checkbox" v-model="acknowledgements.email" />
                  <span
                    >I understand my email can't be changed again for 90 days after
                    verification.</span
                  >
                </label>
              </div>
            </section>
            <div class="popup-actions inline-actions">
              <button type="button" class="popup-button secondary" @click="closeEditEmail">
                Cancel
              </button>
              <button
                type="submit"
                class="popup-button primary"
                :disabled="isSavingEmail || !canSaveEmail"
              >
                {{ isSavingEmail ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Account Popup -->
    <div v-if="showDeleteAccountPopup" class="popup-overlay" @click="closeDeleteAccount">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Delete Account</h3>
          <button class="close-button" @click="closeDeleteAccount">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content">
          <div class="popup-icon">
            <v-icon size="48" color="error">mdi-alert-circle</v-icon>
          </div>
          <p class="popup-message danger">This action cannot be undone!</p>
          <p class="popup-instruction">Deleting your account will permanently remove:</p>
          <ul class="delete-list">
            <li>Your profile and personal information</li>
            <li>All your team memberships</li>
            <li>Your task submissions and history</li>
            <li>All active sessions</li>
          </ul>
          <div class="confirmation-input">
            <label for="deleteConfirm">Type "DELETE" to confirm:</label>
            <input
              id="deleteConfirm"
              v-model="deleteConfirmation"
              type="text"
              class="form-input"
              placeholder="DELETE"
            />
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-button secondary" @click="closeDeleteAccount">Cancel</button>
          <button
            class="popup-button danger"
            @click="confirmDeleteAccount"
            :disabled="deleteConfirmation !== 'DELETE' || isDeleting"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Account' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth.js'

export default {
  name: 'AccountPersonalView',
  setup() {
    const authStore = useAuthStore()
    return { authStore }
  },
  data() {
    return {
      message: null,
      messageTimeout: null,
      showPasswordResetPopup: false,
      showEditProfilePopup: false,
      showDeleteAccountPopup: false,
      showEditUsernamePopup: false,
      showEditEmailPopup: false,
      showPasswordResetConfirm: false,
      isResettingPassword: false,
      editForm: {
        username: '',
        email: '',
      },
      editUsernameForm: {
        username: '',
      },
      editEmailForm: {
        email: '',
      },
      acknowledgements: {
        username: false,
        email: false,
      },
      deleteConfirmation: '',
      isSaving: false,
      isSavingUsername: false,
      isSavingEmail: false,
      isDeleting: false,
    }
  },
  computed: {
    user() {
      return (
        this.authStore.user || {
          userId: '',
          username: '',
          email: '',
          email: null,
          emailVerified: false,
          lastUsernameChangeAt: null,
          lastEmailChangeAt: null,
          emailVerificationExpires: null,
          createdAt: null,
        }
      )
    },
    memberSince() {
      if (!this.user.createdAt) return 'Unknown'

      const date = new Date(this.user.createdAt)
      if (Number.isNaN(date.getTime())) return 'Unknown'

      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    },
    requiresUsernameAcknowledgement() {
      const currentUsername = this.user.username || ''
      const newUsername = this.editUsernameForm.username?.trim() || ''
      return newUsername && newUsername !== currentUsername
    },
    emailMatchesInput() {
      if (!this.user.email) return false
      return this.editEmailForm.email?.trim().toLowerCase() === this.user.email.toLowerCase()
    },
    requiresEmailAcknowledgement() {
      const currentEmail = this.user.email?.toLowerCase() || ''
      const newEmail = this.editEmailForm.email?.trim().toLowerCase() || ''
      if (!newEmail || newEmail === currentEmail) {
        return false
      }
      if (this.emailMatchesInput) {
        return false
      }
      return true
    },
    canSaveProfile() {
      const newUsername = this.editForm.username?.trim() || ''
      const currentUsername = this.user.username || ''
      const newEmail = this.editForm.email?.trim().toLowerCase() || ''
      const currentEmail = this.user.email?.toLowerCase() || ''

      const usernameChanged = newUsername && newUsername !== currentUsername
      const emailChanged = newEmail && newEmail !== currentEmail
      const reissueVerification = this.emailMatchesInput

      // Only require the field that is being changed
      if (!usernameChanged && !emailChanged && !reissueVerification) {
        return false
      }

      // Only require acknowledgement for the field being changed
      if (
        usernameChanged &&
        this.requiresUsernameAcknowledgement &&
        !this.acknowledgements.username
      ) {
        return false
      }
      if (emailChanged && this.requiresEmailAcknowledgement && !this.acknowledgements.email) {
        return false
      }

      // Do not require both username and email to be filled if only one is being changed
      if (usernameChanged && !newUsername) return false
      if (emailChanged && !newEmail) return false

      return true
    },
    canSaveUsername() {
      const newUsername = this.editUsernameForm.username?.trim() || ''
      const currentUsername = this.user.username || ''
      const usernameChanged = newUsername && newUsername !== currentUsername
      if (!usernameChanged) return false
      if (this.requiresUsernameAcknowledgement && !this.acknowledgements.username) return false
      return true
    },
    canSaveEmail() {
      const newEmail = this.editEmailForm.email?.trim().toLowerCase() || ''
      const currentEmail = this.user.email?.toLowerCase() || ''
      if (!newEmail || newEmail === currentEmail) return false
      if (this.emailMatchesInput) return false
      if (this.requiresEmailAcknowledgement && !this.acknowledgements.email) return false
      return true
    },
    usernameLockDeadline() {
      if (!this.user.lastUsernameChangeAt) return null
      const deadline = new Date(this.user.lastUsernameChangeAt)
      if (Number.isNaN(deadline.getTime())) return null
      deadline.setTime(deadline.getTime() + 14 * 24 * 60 * 60 * 1000)
      return deadline > new Date() ? deadline : null
    },
    emailLockDeadline() {
      if (!this.user.lastEmailChangeAt) return null
      const deadline = new Date(this.user.lastEmailChangeAt)
      if (Number.isNaN(deadline.getTime())) return null
      deadline.setTime(deadline.getTime() + 90 * 24 * 60 * 60 * 1000)
      return deadline > new Date() ? deadline : null
    },
    emailVerificationDeadline() {
      if (!this.user.emailVerificationExpires) return null
      const deadline = new Date(this.user.emailVerificationExpires)
      if (Number.isNaN(deadline.getTime())) return null
      return deadline
    },
    usernameCooldownText() {
      const deadline = this.usernameLockDeadline
      if (!deadline) return ''
      const formatted = this.formatDateTime(deadline)
      return formatted ? `on ${formatted}` : ''
    },
    emailCooldownText() {
      const deadline = this.emailLockDeadline
      if (!deadline) return ''
      const formatted = this.formatDateTime(deadline)
      return formatted ? `on ${formatted}` : ''
    },
    emailVerificationDeadlineText() {
      const deadline = this.emailVerificationDeadline
      if (!deadline) return ''
      const formatted = this.formatDateTime(deadline)
      return formatted ? `by ${formatted}` : ''
    },
  },
  async mounted() {
    await this.loadUserData()
  },
  beforeUnmount() {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout)
    }
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

    setUserFromResponse(userData) {
      if (!userData) {
        this.authStore.clearAuth()
        return
      }

      this.authStore.setUserFromApi(userData)
    },

    async loadUserData() {
      try {
        const userData = await this.authStore.fetchUser()
        if (!userData) {
          this.authStore.clearAuth()
        }
      } catch (error) {
        console.log('Error loading user data:', error)
      }
    },

    openEditProfile() {
      this.editForm.username = this.user.username
      this.editForm.email = this.user.email || this.user.email
      this.resetAcknowledgements()
      this.showEditProfilePopup = true
    },

    closeEditProfile() {
      this.showEditProfilePopup = false
      this.resetEditForm()
    },

    async saveProfile() {
      if (!this.canSaveProfile) {
        return
      }

      this.isSaving = true
      try {
        const PORT = import.meta.env.VITE_API_PORT
        const payload = {
          username: this.editForm.username.trim(),
          email: this.editForm.email.trim(),
        }
        const response = await fetch(`${PORT}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        })

        const data = await response.json().catch(() => ({}))

        if (response.ok) {
          if (data.user) {
            this.setUserFromResponse(data.user)
          }

          this.closeEditProfile()

          const messageText = data.message || 'Profile updated successfully!'
          this.showMessage(messageText, data.requiresEmailVerification ? 'info' : 'success')
        } else {
          let errorMessage = data.error || data.message || 'Failed to update profile'
          if (data.error === 'USERNAME_COOLDOWN' || data.error === 'EMAIL_COOLDOWN') {
            if (data.availableAt) {
              const formatted = this.formatDateTime(data.availableAt)
              errorMessage = `You are on cooldown. Next update available on ${formatted}.`
            } else {
              errorMessage = 'You are on cooldown. Please wait until the cooldown period ends.'
            }
          } else if (data.availableAt) {
            const formatted = this.formatDateTime(data.availableAt)
            if (formatted) {
              errorMessage = `${errorMessage} Next update available on ${formatted}.`
            }
          }
          this.showMessage(errorMessage, 'error')
        }
      } catch (error) {
        console.log('Error updating profile:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isSaving = false
      }
    },

    resetEditForm() {
      this.editForm.username = ''
      this.editForm.email = ''
      this.resetAcknowledgements()
    },

    resetAcknowledgements() {
      this.acknowledgements.username = false
      this.acknowledgements.email = false
    },

    openEditUsername() {
      this.editUsernameForm.username = this.user.username
      this.acknowledgements.username = false
      this.showEditUsernamePopup = true
    },

    closeEditUsername() {
      this.showEditUsernamePopup = false
      this.editUsernameForm.username = ''
      this.acknowledgements.username = false
    },

    async saveUsername() {
      if (!this.canSaveUsername) return
      this.isSavingUsername = true
      try {
        const PORT = import.meta.env.VITE_API_PORT
        const payload = { username: this.editUsernameForm.username.trim() }
        const response = await fetch(`${PORT}/api/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok) {
          if (data.user) this.setUserFromResponse(data.user)
          this.closeEditUsername()
          this.showMessage(data.message || 'Username updated successfully!', 'success')
        } else {
          let errorMessage = data.error || data.message || 'Failed to update username'
          if (data.availableAt) {
            const formatted = this.formatDateTime(data.availableAt)
            if (formatted) errorMessage = `${errorMessage} Next update available on ${formatted}.`
          }
          this.showMessage(errorMessage, 'error')
        }
      } catch (error) {
        console.log('Error updating username:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isSavingUsername = false
      }
    },

    openEditEmail() {
      this.editEmailForm.email = this.user.email || this.user.email
      this.acknowledgements.email = false
      this.showEditEmailPopup = true
    },

    closeEditEmail() {
      this.showEditEmailPopup = false
      this.editEmailForm.email = ''
      this.acknowledgements.email = false
    },

    async saveEmail() {
      if (!this.canSaveEmail) return
      this.isSavingEmail = true
      try {
        const PORT = import.meta.env.VITE_API_PORT
        const payload = { email: this.editEmailForm.email.trim() }
        const response = await fetch(`${PORT}/api/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok) {
          if (data.user) this.setUserFromResponse(data.user)
          this.closeEditEmail()
          this.showMessage(
            data.message || 'Email updated successfully!',
            data.requiresEmailVerification ? 'info' : 'success',
          )
        } else {
          let errorMessage = data.error || data.message || 'Failed to update email'
          if (data.availableAt) {
            const formatted = this.formatDateTime(data.availableAt)
            if (formatted) errorMessage = `${errorMessage} Next update available on ${formatted}.`
          }
          this.showMessage(errorMessage, 'error')
        }
      } catch (error) {
        console.log('Error updating email:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isSavingEmail = false
      }
    },

    openDeleteAccount() {
      this.deleteConfirmation = ''
      this.showDeleteAccountPopup = true
    },

    closeDeleteAccount() {
      this.showDeleteAccountPopup = false
      this.deleteConfirmation = ''
    },

    async confirmDeleteAccount() {
      if (this.deleteConfirmation !== 'DELETE') {
        return
      }

      this.isDeleting = true
      try {
        const PORT = import.meta.env.VITE_API_PORT
        const response = await fetch(`${PORT}/api/users/account`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (response.ok) {
          await this.authStore.logout()
          this.$router.push('/login')
          this.showMessage('Account deleted successfully', 'success')
        } else {
          const data = await response.json()
          this.showMessage(data.error || 'Failed to delete account', 'error')
        }
      } catch (error) {
        console.log('Error deleting account:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isDeleting = false
      }
    },

    async changePassword() {
      this.showPasswordResetConfirm = true
    },

    closePasswordResetPopup() {
      this.showPasswordResetPopup = false
    },

    closePasswordResetConfirm() {
      this.showPasswordResetConfirm = false
    },

    async confirmPasswordReset() {
      this.showPasswordResetConfirm = false
      this.isResettingPassword = true
      try {
        const PORT = import.meta.env.VITE_API_PORT
        const response = await fetch(`${PORT}/api/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: this.user.email }),
        })

        if (response.ok) {
          this.showPasswordResetPopup = true
        } else {
          this.showMessage('Failed to send password reset email. Please try again.', 'error')
        }
      } catch (error) {
        console.log('Error sending password reset email:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isResettingPassword = false
      }
    },

    showMessage(text, type = 'info') {
      this.message = { text, type }

      if (this.messageTimeout) {
        clearTimeout(this.messageTimeout)
      }

      this.messageTimeout = setTimeout(() => {
        this.message = null
      }, 5000)
    },
  },
}
</script>

<style scoped>
.account-view {
  min-height: 100vh;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h2 {
  color: #333;
  margin-bottom: 8px;
  font-size: 32px;
}

.header p {
  color: #666;
  font-size: 16px;
}

.tab-navigation {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
  background: white;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  color: #666;
  flex: 1;
  justify-content: center;
  text-decoration: none;
}

.tab-button:hover {
  background: #f8f9fa;
}

.tab-button.active,
.tab-button.router-link-active {
  background: #4a90e2;
  color: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Profile Section Styles */
.profile-section {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.profile-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.profile-title h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.profile-info .email {
  color: #666;
  margin: 0 0 4px 0;
  font-size: 16px;
}

.profile-info .user-id {
  color: #999;
  margin: 0;
  font-size: 14px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
}

.status-chip :deep(.v-icon) {
  font-size: 16px;
}

.status-chip.success {
  background: #e6f4ea;
  color: #156a33;
}

.status-chip.warning {
  background: #fff4d5;
  color: #8b6500;
}

.status-chip.subtle {
  padding: 2px 8px;
  font-size: 11px;
}

.profile-details {
  margin-bottom: 32px;
}

.profile-details h4 {
  color: #333;
  margin-bottom: 16px;
  font-size: 18px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 600;
}

.info-value {
  color: #333;
  font-size: 16px;
  padding: 8px 0;
}

.info-value.pending {
  color: #1d3a8a;
}

.pending-email-banner {
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid #dbe5ff;
  background: linear-gradient(135deg, #f8faff, #eef3ff);
  color: #1d3a8a;
  font-size: 14px;
}

.pending-email-banner strong {
  color: #0d47a1;
}

.pending-email-banner :deep(.v-icon) {
  color: #4a90e2;
  margin-top: 2px;
}

.cooldown-list {
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
  display: grid;
  gap: 12px;
}

.cooldown-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f7f8fb;
  border: 1px solid #e6e9f2;
  color: #4a4d57;
  font-size: 14px;
}

.cooldown-list :deep(.v-icon) {
  color: #4a90e2;
}

.profile-actions h4 {
  color: #333;
  margin-bottom: 16px;
  font-size: 18px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-button.primary {
  background: #4a90e2;
  color: white;
}

.action-button.primary:hover {
  background: #357abd;
}

.action-button.secondary {
  background: #6c757d;
  color: white;
}

.action-button.secondary:hover {
  background: #545b62;
}

.action-button.danger {
  background: #dc3545;
  color: white;
}

.action-button.danger:hover {
  background: #c82333;
}

.message {
  position: fixed;
  top: 10%;
  right: 20px;
  padding: 12px 20px;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  z-index: 2100;
  animation: slideIn 0.3s ease;
}

.message.success {
  background: #28a745;
}

.message.error {
  background: #dc3545;
}

.message.info {
  background: #17a2b8;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Popup Styles */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeInOverlay 0.3s ease;
}

@keyframes fadeInOverlay {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.popup-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popupSlideIn 0.3s ease;
}

@keyframes popupSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  flex-shrink: 0;
}

.popup-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
  flex: 1;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  flex-shrink: 0;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.1);
}

.popup-content {
  padding: 32px 24px;
  text-align: center;
  flex: 1 1 auto;
  overflow-y: auto;
  max-height: 60vh;
}

.popup-actions {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  text-align: center;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 2;
}

.popup-icon {
  margin-bottom: 16px;
}

.popup-message {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.email-address {
  font-size: 16px;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 16px;
  word-break: break-all;
}

.popup-instruction {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .popup-modal {
    margin: 10px;
    width: calc(100% - 20px);
    max-height: 95vh;
    display: flex;
    flex-direction: column;
  }
  .popup-content {
    padding: 20px 16px;
    max-height: 55vh;
    overflow-y: auto;
  }
  .popup-actions {
    padding: 12px 20px;
    position: sticky;
    bottom: 0;
    z-index: 2;
  }
}

.popup-actions {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  text-align: center;
  flex-shrink: 0;
}

.popup-button {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.popup-button.primary {
  background: #4a90e2;
  color: white;
}

.popup-button.primary:hover {
  background: #357abd;
}

.popup-button.secondary {
  background: #6c757d;
  color: white;
  margin-right: 12px;
}

.popup-button.secondary:hover {
  background: #545b62;
}

.popup-button.danger {
  background: #dc3545;
  color: white;
}

.popup-button.danger:hover {
  background: #c82333;
}

.popup-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Form Styles */
.profile-form {
  text-align: left;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.epic-edit-container {
  background: #f4f6fb;
  padding: 24px;
}

.epic-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  text-align: left;
}

.epic-section {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e6e9f2;
  padding: 24px 24px 28px;
  box-shadow: 0 12px 32px rgba(27, 39, 94, 0.08);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.section-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #4a90e2, #7ba8ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.section-icon.accent {
  background: linear-gradient(135deg, #9352ff, #6a57ff);
}

.section-header h4 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #1f2937;
}

.section-header p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
  font-size: 14px;
}

.epic-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.epic-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.input-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9f9fc;
  border: 1px solid #d9dce6;
  border-radius: 14px;
  padding: 0 14px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.input-shell:focus-within {
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
  background: #ffffff;
}

.input-shell .form-input {
  border: none;
  background: transparent;
  padding: 14px 0;
  font-size: 15px;
  color: #111827;
}

.input-shell .form-input:focus {
  border: none;
}

.field-icon {
  color: #4a90e2;
}

.field-helper {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.epic-guidelines {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.epic-guidelines li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f4f6fb;
  color: #4a4d57;
  font-size: 13px;
}

.epic-guidelines :deep(.v-icon) {
  color: #4a90e2;
}

.epic-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #f7e4c2;
  background: #fdf6e9;
  font-size: 13px;
  color: #5a4822;
}

.epic-checkbox input {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  accent-color: #4a90e2;
}

.epic-checkbox span {
  line-height: 1.4;
}

.pending-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #d8e2ff;
  background: #f3f6ff;
  color: #203a95;
  font-size: 13px;
}

.pending-note strong {
  color: #0b2fa2;
}

.pending-note :deep(.v-icon) {
  color: #4a90e2;
  margin-top: 2px;
}

.inline-actions {
  background: transparent;
  border-top: 1px solid #e6e9f2;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 0 0;
  text-align: right;
}

.inline-actions .popup-button.secondary {
  margin-right: 0;
}

.popup-message.danger {
  color: #dc3545;
  font-weight: 600;
}

.delete-list {
  text-align: left;
  margin: 16px 0;
  padding-left: 20px;
}

.delete-list li {
  margin-bottom: 8px;
  color: #666;
}

.confirmation-input {
  margin-top: 20px;
  text-align: left;
}

.confirmation-input label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.edit-inline-btn {
  background: none;
  border: none;
  padding: 2px 6px;
  margin-left: 8px;
  cursor: pointer;
  color: #4a90e2;
  border-radius: 4px;
  transition: background 0.2s;
}

.edit-inline-btn:hover {
  background: #e6f4ea;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .info-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .epic-section {
    padding: 20px;
  }

  .section-header {
    flex-direction: column;
  }

  .inline-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .inline-actions .popup-button {
    width: 100%;
  }

  .tab-navigation {
    max-width: 100%;
  }

  .popup-modal {
    margin: 10px;
    width: calc(100% - 20px);
    max-height: 95vh;
    display: flex;
    flex-direction: column;
  }

  .popup-content {
    padding: 20px 16px;
    max-height: 55vh;
    overflow-y: auto;
  }

  .popup-actions {
    padding: 12px 20px;
    position: sticky;
    bottom: 0;
    z-index: 2;
  }

  .popup-header {
    padding: 16px 20px;
  }

  .popup-header h3 {
    font-size: 18px;
  }

  .popup-actions {
    padding: 12px 20px;
  }

  .close-button {
    padding: 8px;
  }
}
</style>
