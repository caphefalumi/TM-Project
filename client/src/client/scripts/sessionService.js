// Session management service for frontend
class SessionService {
  constructor() {
    this.PORT = import.meta.env.VITE_API_PORT
    this.sessionWarnings = new Set()
  }

  // Get all active sessions for current user
  async getActiveSessions() {
    try {
      const response = await fetch(`${this.PORT}/api/sessions/active`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          sessions: data.sessions,
          totalCount: data.totalCount
        }
      } else {
        console.error('Failed to fetch active sessions:', response.status)
        return { success: false, error: 'Failed to fetch sessions' }
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error)
      return { success: false, error: error.message }
    }
  }

  // Get current session information
  async getCurrentSession() {
    try {
      const response = await fetch(`${this.PORT}/api/sessions/current`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          session: data.session
        }
      } else {
        console.error('Failed to fetch current session:', response.status)
        return { success: false, error: 'Failed to fetch current session' }
      }
    } catch (error) {
      console.error('Error fetching current session:', error)
      return { success: false, error: error.message }
    }
  }

  // Revoke a specific session
  async revokeSession(sessionId) {
    try {
      const response = await fetch(`${this.PORT}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          message: data.success
        }
      } else {
        console.error('Failed to revoke session:', response.status)
        return { success: false, error: 'Failed to revoke session' }
      }
    } catch (error) {
      console.error('Error revoking session:', error)
      return { success: false, error: error.message }
    }
  }

  // Revoke all sessions except current
  async revokeAllOtherSessions() {
    try {
      const response = await fetch(`${this.PORT}/api/sessions/revoke-all/except-current`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          revokedCount: data.revokedCount,
          message: data.message
        }
      } else {
        console.error('Failed to revoke other sessions:', response.status)
        return { success: false, error: 'Failed to revoke sessions' }
      }
    } catch (error) {
      console.error('Error revoking other sessions:', error)
      return { success: false, error: error.message }
    }
  }

  // Check for suspicious activity
  async checkSecurity() {
    try {
      const response = await fetch(`${this.PORT}/api/sessions/security-check`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          isSuspicious: data.isSuspicious,
          sessionCount: data.sessionCount,
          uniqueIPs: data.uniqueIPs,
          sessions: data.sessions
        }
      } else {
        console.error('Failed to check security:', response.status)
        return { success: false, error: 'Failed to check security' }
      }
    } catch (error) {
      console.error('Error checking security:', error)
      return { success: false, error: error.message }
    }
  }

  // Monitor security headers in responses
  checkSecurityHeaders(response) {
    const warnings = []

    if (response.headers.get('X-Security-Warning')) {
      const warning = response.headers.get('X-Security-Warning')
      warnings.push(warning)

      if (warning === 'IP-Change-Detected') {
        this.handleIPChangeWarning()
      } else if (warning === 'Multiple-Sessions-Detected') {
        const sessionCount = response.headers.get('X-Session-Count')
        const uniqueIPs = response.headers.get('X-Unique-IPs')
        this.handleMultipleSessionsWarning(sessionCount, uniqueIPs)
      }
    }

    return warnings
  }

  // Handle IP change detection
  handleIPChangeWarning() {
    if (!this.sessionWarnings.has('ip-change')) {
      this.sessionWarnings.add('ip-change')

      // Show user notification
      this.showSecurityNotification({
        type: 'warning',
        title: 'IP Address Change Detected',
        message: 'Your IP address has changed during this session. If this wasn\'t you, please secure your account.',
        actions: [
          { label: 'Review Sessions', action: 'review-sessions' },
          { label: 'Dismiss', action: 'dismiss' }
        ]
      })
    }
  }

  // Handle multiple sessions warning
  handleMultipleSessionsWarning(sessionCount, uniqueIPs) {
    if (!this.sessionWarnings.has('multiple-sessions')) {
      this.sessionWarnings.add('multiple-sessions')

      this.showSecurityNotification({
        type: 'info',
        title: 'Multiple Active Sessions',
        message: `You have ${sessionCount} active sessions from ${uniqueIPs} different locations.`,
        actions: [
          { label: 'Manage Sessions', action: 'manage-sessions' },
          { label: 'Secure Account', action: 'secure-account' },
          { label: 'Dismiss', action: 'dismiss' }
        ]
      })
    }
  }

  // Show security notification (to be implemented with your notification system)
  showSecurityNotification(notification) {
    // Emit event that components can listen to
    window.dispatchEvent(new CustomEvent('session-security-warning', {
      detail: notification
    }))
  }

  // Clear session warnings
  clearWarnings() {
    this.sessionWarnings.clear()
  }

  // Format session information for display
  formatSessionInfo(session) {
    return {
      ...session,
      lastActivityFormatted: new Date(session.lastActivity).toLocaleString(),
      createdAtFormatted: new Date(session.createdAt).toLocaleString(),
      isCurrentSession: session.isCurrent || false,
      browserInfo: this.parseBrowserInfo(session.userAgent),
      locationInfo: this.getLocationInfo(session.ipAddress)
    }
  }

  // Parse browser information from user agent
  parseBrowserInfo(userAgent) {
    if (!userAgent || userAgent === 'Unknown') return 'Unknown Browser'

    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Google Chrome'
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Microsoft Edge'
    if (userAgent.includes('Opera')) return 'Opera'

    return 'Unknown Browser'
  }

  // Get location information (simplified)
  getLocationInfo(ipAddress) {
    if (!ipAddress) return 'Unknown Location'

    // For localhost/development
    if (ipAddress.includes('127.0.0.1') || ipAddress.includes('::1') || ipAddress.includes('localhost')) {
      return 'Local Development'
    }

    // For private networks
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return 'Private Network'
    }

    return `IP: ${ipAddress}`
  }

  // Session activity monitoring
  startActivityMonitoring() {
    // Monitor for session expiry warnings
    setInterval(async () => {
      const currentSession = await this.getCurrentSession()
      if (currentSession.success && currentSession.session) {
        const session = currentSession.session
        const now = new Date()
        const lastActivity = new Date(session.lastActivity)
        const timeSinceActivity = now - lastActivity

        // Warn if no activity for 10 minutes (configurable)
        if (timeSinceActivity > 10 * 60 * 1000) {
          this.showInactivityWarning(timeSinceActivity)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  // Show inactivity warning
  showInactivityWarning(timeSinceActivity) {
    const minutes = Math.floor(timeSinceActivity / (60 * 1000))

    this.showSecurityNotification({
      type: 'warning',
      title: 'Session Inactivity',
      message: `Your session has been inactive for ${minutes} minutes. Your session will expire automatically after 12 hours of inactivity.`,
      actions: [
        { label: 'Continue Session', action: 'continue' },
        { label: 'Logout', action: 'logout' }
      ]
    })
  }
}

// Create singleton instance
const sessionService = new SessionService()

export default sessionService
