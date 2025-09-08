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
              <h3>{{ user.username }}</h3>
              <p class="email">{{ user.email }}</p>
              <p class="user-id">User ID: {{ user.userId }}</p>
            </div>
          </div>

          <div class="profile-details">
            <h4>Account Information</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Username</label>
                <div class="info-value">{{ user.username }}</div>
              </div>
              <div class="info-item">
                <label>Email Address</label>
                <div class="info-value">{{ maskedEmail }}</div>
              </div>
              <div class="info-item">
                <label>Account ID</label>
                <div class="info-value">{{ user.userId }}</div>
              </div>
              <div class="info-item">
                <label>Member Since</label>
                <div class="info-value">{{ memberSince }}</div>
              </div>
            </div>
          </div>

          <div class="profile-actions">
            <h4>Profile Actions</h4>
            <div class="actions-grid">
              <button class="action-button primary" @click="openEditProfile">
                <v-icon>mdi-pencil</v-icon>
                Edit Profile
              </button>
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
          <p class="popup-message">
            We've sent a password reset link to your email address:
          </p>
          <p class="email-address">{{ user.email }}</p>
          <p class="popup-instruction">
            Please check your inbox and follow the instructions to reset your password.
            If you don't see the email, check your spam folder.
          </p>
        </div>
        <div class="popup-actions">
          <button class="popup-button primary" @click="closePasswordResetPopup">
            Got it
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Profile Popup -->
    <div v-if="showEditProfilePopup" class="popup-overlay" @click="closeEditProfile">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Edit Profile</h3>
          <button class="close-button" @click="closeEditProfile">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content">
          <form @submit.prevent="saveProfile" class="profile-form">
            <div class="form-group">
              <label for="editUsername">Username</label>
              <input
                id="editUsername"
                v-model="editForm.username"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label for="editEmail">Email Address</label>
              <input
                id="editEmail"
                v-model="editForm.email"
                type="email"
                class="form-input"
                required
              />
            </div>
          </form>
        </div>
        <div class="popup-actions">
          <button class="popup-button secondary" @click="closeEditProfile">
            Cancel
          </button>
          <button class="popup-button primary" @click="saveProfile" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
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
          <p class="popup-message danger">
            This action cannot be undone!
          </p>
          <p class="popup-instruction">
            Deleting your account will permanently remove:
          </p>
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
          <button class="popup-button secondary" @click="closeDeleteAccount">
            Cancel
          </button>
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
import AuthStore from '../scripts/authStore.js'

export default {
  name: 'AccountPersonalView',
  data() {
    return {
      user: {
        userId: '',
        username: '',
        email: ''
      },
      message: null,
      messageTimeout: null,
      showPasswordResetPopup: false,
      showEditProfilePopup: false,
      showDeleteAccountPopup: false,
      editForm: {
        username: '',
        email: ''
      },
      deleteConfirmation: '',
      isSaving: false,
      isDeleting: false
    }
  },
  computed: {
    maskedEmail() {
      if (!this.user.email) return ''
      const [username, domain] = this.user.email.split('@')
      if (username.length <= 2) return this.user.email
      const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
      return `${maskedUsername}@${domain}`
    },
    memberSince() {
      return 'January 2024'
    }
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
    async loadUserData() {
      try {
        const userData = await AuthStore.getUserByAccessToken()
        if (userData) {
          this.user = {
            userId: userData.userId,
            username: userData.username,
            email: userData.email
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    },

    openEditProfile() {
      this.editForm.username = this.user.username
      this.editForm.email = this.user.email
      this.showEditProfilePopup = true
    },

    closeEditProfile() {
      this.showEditProfilePopup = false
      this.editForm = {
        username: '',
        email: ''
      }
    },

    async saveProfile() {
      this.isSaving = true
      try {
        const PORT = import.meta.env.VITE_API_PORT
        const response = await fetch(`${PORT}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username: this.editForm.username,
            email: this.editForm.email
          }),
        })

        if (response.ok) {
          this.user.username = this.editForm.username
          this.user.email = this.editForm.email

          localStorage.setItem('currentUser', JSON.stringify({
            userId: this.user.userId,
            username: this.user.username,
            timestamp: Date.now()
          }))

          this.closeEditProfile()
          this.showMessage('Profile updated successfully!', 'success')
        } else {
          const data = await response.json()
          this.showMessage(data.error || 'Failed to update profile', 'error')
        }
      } catch (error) {
        console.error('Error updating profile:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isSaving = false
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
          credentials: 'include'
        })

        if (response.ok) {
          sessionStorage.removeItem('isLoggedIn')
          localStorage.removeItem('currentUser')

          await AuthStore.logout()
          this.$router.push('/login')
          this.showMessage('Account deleted successfully', 'success')
        } else {
          const data = await response.json()
          this.showMessage(data.error || 'Failed to delete account', 'error')
        }
      } catch (error) {
        console.error('Error deleting account:', error)
        this.showMessage('Network error. Please try again.', 'error')
      } finally {
        this.isDeleting = false
      }
    },

    async changePassword() {
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
        console.error('Error sending password reset email:', error)
        this.showMessage('Network error. Please try again.', 'error')
      }
    },

    closePasswordResetPopup() {
      this.showPasswordResetPopup = false
    },

    showMessage(text, type = 'info') {
      this.message = { text, type }

      if (this.messageTimeout) {
        clearTimeout(this.messageTimeout)
      }

      this.messageTimeout = setTimeout(() => {
        this.message = null
      }, 5000)
    }
  }
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
  background: #4A90E2;
  color: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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

.profile-info h3 {
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
  background: #4A90E2;
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
  from { opacity: 0; }
  to { opacity: 1; }
}

.popup-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
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
  color: #4A90E2;
  margin-bottom: 16px;
  word-break: break-all;
}

.popup-instruction {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 0;
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
  background: #4A90E2;
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
  border-color: #4A90E2;
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

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .info-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .tab-navigation {
    max-width: 100%;
  }

  .popup-modal {
    margin: 10px;
    width: calc(100% - 20px);
    max-height: 95vh;
  }

  .popup-content {
    padding: 20px 16px;
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
