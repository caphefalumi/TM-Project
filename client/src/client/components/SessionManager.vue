<template>
  <div class="session-manager">
    <div v-if="!embedded" class="session-header">
      <h3>Active Sessions</h3>
      <p class="session-subtitle">Manage your active login sessions across different devices</p>
    </div>
    <div v-else class="session-header-embedded">
      <h4>Active Sessions</h4>
    </div>

    <!-- Security Status -->
    <div v-if="securityCheck.isSuspicious" class="security-alert warning">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <h4>Suspicious Activity Detected</h4>
        <p>{{ securityCheck.sessionCount }} sessions from {{ securityCheck.uniqueIPs }} different locations</p>
        <button @click="handleSecurityAction" class="btn-primary">Review & Secure</button>
      </div>
    </div>

    <!-- Current Session Info -->
    <div v-if="currentSession" class="current-session">
      <h4>Current Session</h4>
      <div class="session-card current">
        <div class="session-info">
          <div class="session-primary">
            <span class="device-icon">💻</span>
            <div>
              <div class="browser-name">{{ formatSessionInfo(currentSession).browserInfo }}</div>
              <div class="location">{{ formatSessionInfo(currentSession).locationInfo }}</div>
            </div>
          </div>
          <div class="session-meta">
            <div class="timestamp">
              Last active: {{ formatSessionInfo(currentSession).lastActivityFormatted }}
            </div>
            <div class="session-status current-badge">Current Session</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Other Sessions -->
    <div v-if="otherSessions.length > 0" class="other-sessions">
      <div class="section-header">
        <h4>Other Sessions ({{ otherSessions.length }})</h4>
        <button
          @click="revokeAllOther"
          :disabled="loading"
          class="btn-secondary"
        >
          {{ loading ? 'Revoking...' : 'End All Other Sessions' }}
        </button>
      </div>

      <div class="sessions-list">
        <div
          v-for="session in otherSessions"
          :key="session.sessionId"
          class="session-card"
        >
          <div class="session-info">
            <div class="session-primary">
              <span class="device-icon">{{ getDeviceIcon(session.userAgent) }}</span>
              <div>
                <div class="browser-name">{{ formatSessionInfo(session).browserInfo }}</div>
                <div class="location">{{ formatSessionInfo(session).locationInfo }}</div>
              </div>
            </div>
            <div class="session-meta">
              <div class="timestamp">
                Last active: {{ formatSessionInfo(session).lastActivityFormatted }}
              </div>
              <div class="session-created">
                Started: {{ formatSessionInfo(session).createdAtFormatted }}
              </div>
            </div>
          </div>
          <div class="session-actions">
            <button
              @click="revokeSession(session.sessionId)"
              :disabled="loading"
              class="btn-danger"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No Other Sessions -->
    <div v-else-if="!loading && sessions.length <= 1" class="no-sessions">
      <div class="empty-state">
        <span class="empty-icon">🔒</span>
        <h4>Only Current Session Active</h4>
        <p>You don't have any other active sessions. Your account is secure.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading sessions...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <p>{{ error }}</p>
      <button @click="loadSessions" class="btn-primary">Retry</button>
    </div>
  </div>
</template>

<script>
import sessionService from '../scripts/sessionService.js'

export default {
  name: 'SessionManager',
  props: {
    embedded: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      sessions: [],
      currentSession: null,
      securityCheck: {
        isSuspicious: false,
        sessionCount: 0,
        uniqueIPs: 0
      },
      loading: false,
      error: null
    }
  },
  computed: {
    otherSessions() {
      return this.sessions.filter(session => !session.isCurrent)
    }
  },
  async mounted() {
    await this.loadSessions()
    await this.loadCurrentSession()
    await this.checkSecurity()
  },
  methods: {
    async loadSessions() {
      this.loading = true
      this.error = null

      try {
        const result = await sessionService.getActiveSessions()
        if (result.success) {
          this.sessions = result.sessions
        } else {
          this.error = result.error
        }
      } catch (error) {
        this.error = 'Failed to load sessions'
        console.error('Error loading sessions:', error)
      } finally {
        this.loading = false
      }
    },

    async loadCurrentSession() {
      try {
        const result = await sessionService.getCurrentSession()
        if (result.success) {
          this.currentSession = result.session
        }
      } catch (error) {
        console.error('Error loading current session:', error)
      }
    },

    async checkSecurity() {
      try {
        const result = await sessionService.checkSecurity()
        if (result.success) {
          this.securityCheck = {
            isSuspicious: result.isSuspicious,
            sessionCount: result.sessionCount,
            uniqueIPs: result.uniqueIPs
          }
        }
      } catch (error) {
        console.error('Error checking security:', error)
      }
    },

    async revokeSession(sessionId) {
      this.loading = true
      try {
        const result = await sessionService.revokeSession(sessionId)
        if (result.success) {
          // Remove from local list
          this.sessions = this.sessions.filter(s => s.sessionId !== sessionId)
          this.$emit('session-revoked', { sessionId })

          // Show success message
          this.showMessage('Session ended successfully', 'success')
        } else {
          this.showMessage(result.error || 'Failed to end session', 'error')
        }
      } catch (error) {
        this.showMessage('Error ending session', 'error')
        console.error('Error revoking session:', error)
      } finally {
        this.loading = false
      }
    },

    async revokeAllOther() {
      if (!confirm('Are you sure you want to end all other sessions? This will log you out of all other devices.')) {
        return
      }

      this.loading = true
      try {
        const result = await sessionService.revokeAllOtherSessions()
        if (result.success) {
          // Update local list to show only current session
          this.sessions = this.sessions.filter(s => s.isCurrent)
          this.$emit('sessions-revoked', { count: result.revokedCount })

          this.showMessage(`${result.revokedCount} sessions ended successfully`, 'success')
        } else {
          this.showMessage(result.error || 'Failed to end sessions', 'error')
        }
      } catch (error) {
        this.showMessage('Error ending sessions', 'error')
        console.error('Error revoking other sessions:', error)
      } finally {
        this.loading = false
      }
    },

    async handleSecurityAction() {
      // For now, just refresh the data
      await this.loadSessions()
      await this.checkSecurity()

      // Could open a more detailed security review modal
      this.$emit('security-review-requested')
    },

    formatSessionInfo(session) {
      return sessionService.formatSessionInfo(session)
    },

    getDeviceIcon(userAgent) {
      if (!userAgent) return '💻'

      if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        return '📱'
      }
      if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        return '📟'
      }
      return '💻'
    },

    showMessage(message, type) {
      // Emit event for parent to handle notification
      this.$emit('show-message', { message, type })
    }
  }
}
</script>

<style scoped>
.session-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.session-header {
  margin-bottom: 30px;
}

.session-header h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.session-subtitle {
  color: #666;
  margin: 0;
}

.security-alert {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.security-alert.warning {
  background: #fff3cd;
  border-color: #ffeaa7;
}

.alert-icon {
  font-size: 24px;
  margin-right: 12px;
}

.alert-content h4 {
  margin: 0 0 8px 0;
  color: #856404;
}

.alert-content p {
  margin: 0 0 12px 0;
  color: #856404;
}

.current-session, .other-sessions {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  color: #333;
}

.session-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
  transition: border-color 0.2s;
}

.session-card:hover {
  border-color: #4A90E2;
}

.session-card.current {
  border-color: #28a745;
  background: #f8fff9;
}

.session-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.session-primary {
  display: flex;
  align-items: center;
  flex: 1;
}

.device-icon {
  font-size: 24px;
  margin-right: 12px;
}

.browser-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.location {
  color: #666;
  font-size: 14px;
}

.session-meta {
  text-align: right;
  font-size: 14px;
}

.timestamp, .session-created {
  color: #666;
  margin-bottom: 4px;
}

.current-badge {
  background: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.session-actions {
  margin-top: 12px;
}

.sessions-list .session-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sessions-list .session-info {
  flex: 1;
  margin-right: 16px;
}

.no-sessions {
  text-align: center;
  padding: 40px 20px;
}

.empty-state {
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.loading-state, .error-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4A90E2;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
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

.btn-primary:disabled, .btn-secondary:disabled, .btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
