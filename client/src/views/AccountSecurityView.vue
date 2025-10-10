<template>
  <div class="account-view">
    <div class="container">
      <div class="header">
        <h2>Security Settings</h2>
        <p>Manage your account security and active sessions</p>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <router-link to="/account/personal" class="tab-button">
          <v-icon class="tab-icon">mdi-account</v-icon>
          Personal
        </router-link>
        <router-link to="/account/security" class="tab-button active">
          <v-icon class="tab-icon">mdi-shield-lock</v-icon>
          Security
        </router-link>
      </div>

      <!-- Security Section -->
      <div class="tab-content security-section">
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
                  <span class="stat-value">{{ sessionStats.uniqueLocations }}</span>
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
          <SessionManager />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SessionManager from '../components/SessionManager.vue'
import sessionService from '../services/sessionService.js'

export default {
  name: 'AccountSecurityView',
  components: {
    SessionManager,
  },
  data() {
    return {
      sessionStats: {
        sessionCount: 0,
        uniqueIPs: 0,
        uniqueLocations: 0,
        lastActivity: 'Loading...',
      },
    }
  },
  async mounted() {
    await this.loadSessionStats()
    sessionService.startActivityMonitoring()
  },
  methods: {
    async loadSessionStats() {
      try {
        const [sessionsResult, securityResult] = await Promise.all([
          sessionService.getActiveSessions(),
          sessionService.checkSecurity(),
        ])

        if (sessionsResult.success) {
          this.sessionStats.sessionCount = sessionsResult.totalCount

          // Calculate unique locations
          const uniqueLocations = [
            ...new Set(
              sessionsResult.tokens
                .map((token) => token.location)
                .filter(
                  (location) => location && location !== 'Unknown, Unknown' && location !== ', ',
                ),
            ),
          ].length
          this.sessionStats.uniqueLocations = uniqueLocations

          // Get last activity from the current session or most recent session
          const currentSession = sessionsResult.tokens.find((token) => token.isCurrent)
          if (currentSession) {
            const formatted = sessionService.formatSessionInfo(currentSession)
            this.sessionStats.lastActivity = formatted.lastActivityFormatted
          } else if (sessionsResult.tokens.length > 0) {
            // Fallback to most recent session if no current session found
            const mostRecent = sessionsResult.tokens[0]
            const formatted = sessionService.formatSessionInfo(mostRecent)
            this.sessionStats.lastActivity = formatted.lastActivityFormatted
          }
        }

        if (securityResult.success) {
          this.sessionStats.uniqueIPs = securityResult.uniqueIPs
        }
      } catch (error) {
        console.log('Error loading session stats:', error)
      }
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
  color: #4a90e2;
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

@media (max-width: 768px) {
  .stats {
    flex-direction: column;
    gap: 16px;
  }

  .tab-navigation {
    max-width: 100%;
  }
}
</style>
