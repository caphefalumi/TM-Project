<template>
  <div class="session-manager">
    <div class="section-header">
      <h3>Active Sessions</h3>
      <span class="session-count">{{ sessions.length }} active</span>
    </div>

    <div v-if="loading" class="loading">
      <p>Loading sessions...</p>
    </div>

    <div v-else-if="sessions.length === 0" class="no-sessions">
      <p>No active sessions found</p>
    </div>

    <div v-else class="sessions-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ 'current-session': session.isCurrent }"
      >
        <div class="session-info">
          <div class="session-header">
            <div class="device-info">
              <v-icon class="device-icon">{{ getDeviceIcon(session.device) }}</v-icon>
              <span class="device-name">{{ session.browser }}</span>
              <span v-if="session.isCurrent" class="current-badge">Current</span>
            </div>
            <div class="session-actions">
              <button
                v-if="!session.isCurrent"
                @click="revokeSession(session.id)"
                class="btn-revoke"
                :disabled="revoking"
              >
                <v-icon>mdi-close</v-icon>
                End
              </button>
            </div>
          </div>

          <div class="session-details">
            <div class="detail-item">
              <v-icon class="detail-icon">mdi-web</v-icon>
              <span>{{ formatIpAddress(session.ipAddress) }}</span>
            </div>
            <div class="detail-item">
              <v-icon class="detail-icon">mdi-map-marker</v-icon>
              <span>{{ formatLocation(session.location) }}</span>
            </div>
            <div class="detail-item">
              <v-icon class="detail-icon">mdi-clock</v-icon>
              <span>Last active {{ formatLastActivity(session.lastActivity) }}</span>
            </div>
            <div class="detail-item">
              <v-icon class="detail-icon">mdi-counter</v-icon>
              <span>{{ session.activityCount }} activities</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="sessions.length > 1" class="bulk-actions">
      <button @click="revokeAllOtherSessions" class="btn-danger" :disabled="revoking">
        <v-icon>mdi-logout-variant</v-icon>
        End All Other Sessions
      </button>
    </div>

    <!-- Loading overlay -->
    <div v-if="revoking" class="loading-overlay">
      <p>Processing...</p>
    </div>
  </div>
</template>

<script>
import sessionService from '../services/sessionService.js'

export default {
  name: 'SessionManager',
  data() {
    return {
      sessions: [],
      loading: true,
      revoking: false,
      currentSessionId: null,
    }
  },
  async mounted() {
    await this.loadSessions()
  },
  methods: {
    async loadSessions() {
      this.loading = true
      try {
        const activeResult = await sessionService.getActiveSessions()
        console.log('activeResult:', activeResult)

        if (activeResult.success) {
          this.sessions = activeResult.tokens.map((token) => ({
            id: token.id,
            ipAddress: token.ipAddress,
            location: token.location,
            browser: token.browser,
            device: token.device,
            lastActivity: token.lastActivity,
            activityCount: token.activityCount,
            createdAt: token.createdAt,
            isCurrent: token.isCurrent || false,
          }))

          // Find and store current session ID
          const currentSession = this.sessions.find((s) => s.isCurrent)
          if (currentSession) {
            this.currentSessionId = currentSession.id
          }

          // Sort: current session first, then by last activity
          this.sessions.sort((a, b) => {
            if (a.isCurrent) return -1
            if (b.isCurrent) return 1
            return new Date(b.lastActivity) - new Date(a.lastActivity)
          })
        }
      } catch (error) {
        console.log('Error loading sessions:', error)
      } finally {
        this.loading = false
      }
    },

    async revokeSession(sessionId) {
      if (sessionId === this.currentSessionId) {
        return
      }

      this.revoking = true
      try {
        const result = await sessionService.revokeSession(sessionId)
        if (result.success) {
          // Remove session from list
          this.sessions = this.sessions.filter((s) => s.id !== sessionId)
          this.$emit('session-revoked', { sessionId })
          this.$emit('show-message', 'Session ended successfully', 'success')
        } else {
          this.$emit('show-message', 'Failed to end session', 'error')
        }
      } catch (error) {
        console.log('Error revoking session:', error)
        this.$emit('show-message', 'Error ending session', 'error')
      } finally {
        this.revoking = false
      }
    },

    async revokeAllOtherSessions() {
      this.revoking = true
      try {
        const result = await sessionService.revokeAllOtherSessions()
        if (result.success) {
          // Keep only current session
          const revokedCount = this.sessions.filter((s) => !s.isCurrent).length
          this.sessions = this.sessions.filter((s) => s.isCurrent)
          this.$emit('sessions-revoked', { count: revokedCount })
          this.$emit('show-message', `${revokedCount} sessions ended successfully`, 'success')
        } else {
          this.$emit('show-message', 'Failed to end sessions', 'error')
        }
      } catch (error) {
        console.log('Error revoking sessions:', error)
        this.$emit('show-message', 'Error ending sessions', 'error')
      } finally {
        this.revoking = false
      }
    },

    getDeviceIcon(device) {
      const deviceLower = device.toLowerCase()
      if (deviceLower.includes('mobile') || deviceLower.includes('phone')) {
        return 'mdi-cellphone'
      }
      if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
        return 'mdi-tablet'
      }
      return 'mdi-monitor'
    },

    formatLastActivity(dateString) {
      const now = new Date()
      const activityDate = new Date(dateString)
      const diffMs = now - activityDate
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'just now'
      if (diffMins < 60) return `${diffMins} min ago`

      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`

      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    },

    formatIpAddress(ipAddress) {
      return sessionService.formatIpAddress(ipAddress)
    },

    formatLocation(location) {
      if (!location || location === 'Unknown, Unknown' || location === ', ') {
        return 'Unknown Location'
      }
      if (location === 'Local, Local') {
        return 'Local Network'
      }
      return location
    },
  },
}
</script>

<style scoped>
.session-manager {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.session-count {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.loading,
.no-sessions {
  text-align: center;
  padding: 40px;
  color: #666;
}

.session-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.session-item:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.session-item.current-session {
  border-color: #4caf50;
  background: #f1f8e9;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-icon {
  color: #666;
  font-size: 20px;
}

.device-name {
  font-weight: 500;
  color: #333;
}

.current-badge {
  background: #4caf50;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
}

.session-actions .btn-revoke {
  background: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.2s ease;
}

.session-actions .btn-revoke:hover:not(:disabled) {
  background: #d32f2f;
}

.session-actions .btn-revoke:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.session-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 14px;
}

.detail-icon {
  font-size: 16px;
  color: #999;
}

.bulk-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.btn-danger {
  background: #f44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

.btn-danger:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

@media (max-width: 768px) {
  .session-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .session-details {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
