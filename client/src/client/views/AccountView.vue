<template>
  <div class="account-view">
    <div class="container">
      <div class="header">
        <h2>Account Management</h2>
        <p>Manage your profile and security settings</p>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button
          :class="['tab-button', { 'active': activeTab === 'profile' }]"
          @click="activeTab = 'profile'"
        >
          <v-icon class="tab-icon">mdi-account</v-icon>
          Profile
        </button>
        <button
          :class="['tab-button', { 'active': activeTab === 'security' }]"
          @click="activeTab = 'security'"
        >
          <v-icon class="tab-icon">mdi-shield-lock</v-icon>
          Security
        </button>
      </div>

      <!-- Profile Section -->
      <div v-if="activeTab === 'profile'" class="tab-content profile-section">
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

      <!-- Security Section -->
      <div v-if="activeTab === 'security'" class="tab-content security-section">
        <!-- Security Overview -->
        <div class="security-overview">
          <div class="security-card">
            <div class="card-header">
              <h3>Session Security</h3>
              <span v-if="sessionStats.sessionCount > 1" class="warning-badge">
                {{ sessionStats.sessionCount }} Active Sessions
              </span>
              <span v-else class="success-badge">Secure</span>
            </div>
            <div class="card-content">
              <p>Manage your active login sessions and monitor security.</p>
              <div class="stats">
                <div class="stat">
                  <span class="stat-value">{{ sessionStats.sessionCount }}</span>
                  <span class="stat-label">Active Sessions</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ sessionStats.uniqueIPs }}</span>
                  <span class="stat-label">Unique Locations</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ sessionStats.lastActivity }}</span>
                  <span class="stat-label">Last Activity</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Session Manager -->
        <div class="session-section">
          <SessionManager
            @session-revoked="handleSessionRevoked"
            @sessions-revoked="handleSessionsRevoked"
            @show-message="showMessage"
          />
        </div>

        <!-- Security Actions -->
        <div class="security-actions">
          <h3>Security Actions</h3>
          <div class="actions-grid">
            <div class="action-card">
              <div class="action-icon">🔒</div>
              <div class="action-content">
                <h4>Change Password</h4>
                <p>Update your account password for better security</p>
                <button @click="changePassword" class="btn-primary">Change Password</button>
              </div>
            </div>

            <div class="action-card">
              <div class="action-icon">🗑️</div>
              <div class="action-content">
                <h4>Delete Account</h4>
                <p>Permanently delete your account and all associated data</p>
                <button @click="openDeleteAccount" class="btn-danger">Delete Account</button>
              </div>
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

    <!-- Activity Log Popup -->
    <div v-if="showActivityLogPopup" class="popup-overlay" @click="closeActivityLog">
      <div class="popup-modal large-modal activity-modal" @click.stop>
        <div class="popup-header">
          <h3>Account Activity Log</h3>
          <button class="close-button" @click="closeActivityLog">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content activity-content">
          <div class="activity-log">
            <div v-if="activityLog.length === 0" class="no-activity">
              <v-icon size="48" color="grey">mdi-history</v-icon>
              <p>No recent activity to display</p>
            </div>
            <div v-else class="activity-list">
              <div v-for="activity in activityLog" :key="activity.id" class="activity-item">
                <div class="activity-icon">
                  <v-icon :color="getActivityIconColor(activity.type)">
                    {{ getActivityIcon(activity.type) }}
                  </v-icon>
                </div>
                <div class="activity-details">
                  <div class="activity-title">{{ activity.title }}</div>
                  <div class="activity-description">{{ activity.description }}</div>
                  <div class="activity-time">{{ activity.timestamp }}</div>
                </div>
                <div class="activity-location" v-if="activity.location">
                  {{ activity.location }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-button secondary" @click="closeActivityLog">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Emergency Logout Popup -->
    <div v-if="showEmergencyLogoutPopup" class="popup-overlay" @click="closeEmergencyLogout">
      <div class="popup-modal" @click.stop>
        <div class="popup-header">
          <h3>Emergency Logout</h3>
          <button class="close-button" @click="closeEmergencyLogout">
            <v-icon>mdi-close</v-icon>
          </button>
        </div>
        <div class="popup-content">
          <div class="popup-icon">
            <v-icon size="48" color="warning">mdi-alert</v-icon>
          </div>
          <p class="popup-message">
            This will end ALL your active sessions and log you out everywhere.
          </p>
          <p class="popup-instruction">
            You will need to log in again on all devices. This action cannot be undone.
          </p>
          <p class="popup-message danger">
            Are you sure you want to continue?
          </p>
        </div>
        <div class="popup-actions">
          <button class="popup-button secondary" @click="closeEmergencyLogout">
            Cancel
          </button>
          <button
            class="popup-button danger"
            @click="confirmEmergencyLogout"
            :disabled="isLoggingOut"
          >
            {{ isLoggingOut ? 'Logging out...' : 'End All Sessions' }}
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
import SessionManager from '../components/SessionManager.vue'
import sessionService from '../scripts/sessionService.js'
import AuthStore from '../scripts/authStore.js'

export default {
  name: 'AccountView',
  components: {
    SessionManager
  },
  data() {
    return {
      activeTab: 'profile',
      user: {
        userId: '',
        username: '',
        email: ''
      },
      sessionStats: {
        sessionCount: 0,
        uniqueIPs: 0,
        lastActivity: 'Loading...'
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
      // This would typically come from user data
      return 'January 2024'
    }
  },
  async mounted() {
    await this.loadUserData()
    await this.loadSessionStats()

    // Start session activity monitoring
    sessionService.startActivityMonitoring()

    // Check if we should open security tab (from query params)
    if (this.$route.query.tab === 'security') {
      this.activeTab = 'security'
    }
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

    async loadSessionStats() {
      try {
        const [sessionsResult, currentResult, securityResult] = await Promise.all([
          sessionService.getActiveSessions(),
          sessionService.getCurrentSession(),
          sessionService.checkSecurity()
        ])

        if (sessionsResult.success) {
          this.sessionStats.sessionCount = sessionsResult.totalCount
        }

        if (currentResult.success) {
          const formatted = sessionService.formatSessionInfo(currentResult.session)
          this.sessionStats.lastActivity = formatted.lastActivityFormatted
        }

        if (securityResult.success) {
          this.sessionStats.uniqueIPs = securityResult.uniqueIPs
        }
      } catch (error) {
        console.error('Error loading session stats:', error)
      }
    },

    switchToSecurity() {
      this.activeTab = 'security'
      // Update URL without page reload
      this.$router.replace({ query: { tab: 'security' } })
    },

    handleSessionRevoked(data) {
      this.sessionStats.sessionCount = Math.max(0, this.sessionStats.sessionCount - 1)
      this.showMessage('Session ended successfully', 'success')
    },

    handleSessionsRevoked(data) {
      this.sessionStats.sessionCount = Math.max(1, this.sessionStats.sessionCount - data.count)
      this.showMessage(`${data.count} sessions ended successfully`, 'success')
    },

    handleSecurityReview() {
      this.switchToSecurity()
      this.showMessage('Please review your active sessions below', 'info')
    },

    editProfile() {
      this.showMessage('Profile editing feature coming soon', 'info')
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
          // Update local user data
          this.user.username = this.editForm.username
          this.user.email = this.editForm.email

          // Update localStorage for cross-tab detection
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
          // Clear all local data
          sessionStorage.removeItem('isLoggedIn')
          localStorage.removeItem('currentUser')

          // Logout and redirect
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

    openEmergencyLogout() {
      this.showEmergencyLogoutPopup = true
    },

    closeEmergencyLogout() {
      this.showEmergencyLogoutPopup = false
    },

    async confirmEmergencyLogout() {
      this.isLoggingOut = true
      try {
        const result = await sessionService.revokeAllOtherSessions()
        if (result.success) {
          // Also logout current session
          await AuthStore.logout()
          this.$router.push('/login')
        } else {
          this.showMessage('Failed to end all sessions', 'error')
        }
      } catch (error) {
        this.showMessage('Error during emergency logout', 'error')
        console.error('Emergency logout error:', error)
      } finally {
        this.isLoggingOut = false
        this.closeEmergencyLogout()
      }
    },

    openActivityLog() {
      this.loadActivityLog()
      this.showActivityLogPopup = true
    },

    closeActivityLog() {
      this.showActivityLogPopup = false
    },

    async loadActivityLog() {
      try {
        // Mock activity log data - replace with actual API call
        this.activityLog = [
          {
            id: 1,
            type: 'login',
            title: 'Login',
            description: 'Successful login from new device',
            timestamp: '2 hours ago',
            location: 'New York, US'
          },
          {
            id: 2,
            type: 'profile',
            title: 'Profile Updated',
            description: 'Email address changed',
            timestamp: '1 day ago',
            location: 'New York, US'
          },
          {
            id: 3,
            type: 'security',
            title: 'Password Changed',
            description: 'Password reset completed',
            timestamp: '3 days ago',
            location: 'New York, US'
          },
          {
            id: 4,
            type: 'logout',
            title: 'Session Ended',
            description: 'Logged out from mobile device',
            timestamp: '1 week ago',
            location: 'California, US'
          }
        ]
      } catch (error) {
        console.error('Error loading activity log:', error)
        this.showMessage('Failed to load activity log', 'error')
      }
    },

    getActivityIcon(type) {
      switch (type) {
        case 'login': return 'mdi-login'
        case 'logout': return 'mdi-logout'
        case 'profile': return 'mdi-account-edit'
        case 'security': return 'mdi-shield-check'
        case 'password': return 'mdi-lock-reset'
        default: return 'mdi-information'
      }
    },

    getActivityIconColor(type) {
      switch (type) {
        case 'login': return 'success'
        case 'logout': return 'warning'
        case 'profile': return 'primary'
        case 'security': return 'success'
        case 'password': return 'orange'
        default: return 'grey'
      }
    },

    async handleLogout() {
      try {
        await AuthStore.logout()
        this.$router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
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
}

.tab-button:hover {
  background: #f8f9fa;
}

.tab-button.active {
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

/* Security Section Styles */
.security-overview {
  margin-bottom: 40px;
}

.security-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  color: #333;
}

.warning-badge {
  background: #ffc107;
  color: #856404;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.success-badge {
  background: #28a745;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.card-content p {
  color: #666;
  margin-bottom: 20px;
}

.stats {
  display: flex;
  gap: 32px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #4A90E2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.session-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
}

.security-actions h3 {
  color: #333;
  margin-bottom: 24px;
}

.security-actions .actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.action-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.action-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-content h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.action-content p {
  color: #666;
  margin-bottom: 16px;
  font-size: 14px;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #4A90E2;
  color: white;
}

.btn-primary:hover {
  background: #357abd;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
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

.large-modal {
  max-width: 700px;
  max-height: 85vh;
}

.activity-modal {
  display: flex;
  flex-direction: column;
}

.activity-content {
  padding: 16px 24px;
  flex: 1;
  overflow: hidden;
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

/* Activity Log Styles */
.activity-log {
  max-height: 50vh;
  overflow-y: auto;
  min-height: 200px;
}

.no-activity {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.no-activity p {
  margin-top: 16px;
  font-size: 16px;
}

.activity-list {
  text-align: left;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 12px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.activity-item:hover {
  background: #f8f9fa;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-details {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 14px;
}

.activity-description {
  color: #666;
  font-size: 13px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.activity-time {
  color: #999;
  font-size: 12px;
}

.activity-location {
  color: #666;
  font-size: 11px;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 2px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .stats {
    flex-direction: column;
    gap: 16px;
  }

  .info-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    flex-direction: column;
    text-align: center;
  }

  .tab-navigation {
    max-width: 100%;
  }

  .popup-modal {
    margin: 10px;
    width: calc(100% - 20px);
    max-height: 95vh;
  }

  .large-modal {
    max-width: none;
    width: calc(100% - 20px);
    max-height: 95vh;
  }

  .popup-content {
    padding: 20px 16px;
  }

  .activity-content {
    padding: 12px 16px;
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

  .activity-log {
    max-height: 60vh;
  }

  .activity-item {
    padding: 12px 8px;
    gap: 8px;
  }

  .activity-icon {
    width: 32px;
    height: 32px;
  }

  .activity-location {
    display: none;
  }

  .activity-title {
    font-size: 13px;
  }

  .activity-description {
    font-size: 12px;
  }

  .close-button {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .popup-modal {
    margin: 5px;
    width: calc(100% - 10px);
    max-height: 98vh;
  }

  .large-modal {
    width: calc(100% - 10px);
    max-height: 98vh;
  }

  .popup-header {
    padding: 12px 16px;
  }

  .popup-header h3 {
    font-size: 16px;
  }

  .activity-content {
    padding: 8px 12px;
  }

  .popup-actions {
    padding: 8px 16px;
  }

  .activity-log {
    max-height: 65vh;
  }

  .activity-item {
    padding: 8px 4px;
    gap: 6px;
  }

  .activity-icon {
    width: 28px;
    height: 28px;
  }

  .activity-title {
    font-size: 12px;
  }

  .activity-description {
    font-size: 11px;
  }

  .activity-time {
    font-size: 10px;
  }

  .popup-button {
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style>
