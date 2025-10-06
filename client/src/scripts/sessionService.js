/**
 * Session Service - RefreshToken-based session management
 * Replaces the old session management with refresh token activity tracking
 */

class SessionService {
  constructor() {
    this.warnings = new Set()
    this.isMonitoring = false
    this.monitoringInterval = null
  }

  /**
   * Get active sessions (refresh tokens)
   */
  async getActiveSessions() {
    const PORT = import.meta.env.VITE_API_PORT
    try {
      const response = await fetch(`${PORT}/api/sessions/active`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          ...data,
        }
      } else {
        console.log('Failed to fetch active sessions:', response.statusText)
        return { success: false, error: response.statusText }
      }
    } catch (error) {
      console.log('Error fetching active sessions:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check for security issues
   */
  async checkSecurity() {
    const PORT = import.meta.env.VITE_API_PORT
    try {
      const response = await fetch(`${PORT}/api/sessions/security`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()

        // Add security warnings if needed
        if (data.isSuspicious) {
          this.warnings.add('suspicious_activity')
        }
        if (data.uniqueIPs > 3) {
          this.warnings.add('multiple_locations')
        }

        return {
          success: true,
          ...data,
        }
      } else {
        console.log('Failed to check security:', response.statusText)
        return { success: false, error: response.statusText }
      }
    } catch (error) {
      console.log('Error checking security:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId) {
    const PORT = import.meta.env.VITE_API_PORT
    try {
      const response = await fetch(`${PORT}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, message: data.message }
      } else {
        console.log('Failed to revoke session:', response.statusText)
        return { success: false, error: response.statusText }
      }
    } catch (error) {
      console.log('Error revoking session:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Revoke all other sessions except current
   */
  async revokeAllOtherSessions() {
    const PORT = import.meta.env.VITE_API_PORT
    try {
      const response = await fetch(`${PORT}/api/sessions/others/all`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        this.clearWarnings()
        return {
          success: true,
          message: data.message,
          count: data.count,
        }
      } else {
        console.log('Failed to revoke other sessions:', response.statusText)
        return { success: false, error: response.statusText }
      }
    } catch (error) {
      console.log('Error revoking other sessions:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Format session info for display
   */
  formatSessionInfo(session) {
    if (!session) return {}

    const formatDate = (date) => {
      const now = new Date()
      const sessionDate = new Date(date)
      const diffMs = now - sessionDate
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} min ago`

      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`

      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    }

    return {
      ...session,
      lastActivityFormatted: formatDate(session.lastActivity),
      createdAtFormatted: formatDate(session.createdAt),
      isCurrentSession: true, // Since we're formatting current session
    }
  }

  /**
   * Format IP address for display
   * @param {string} ipAddress - The IP address to format
   * @returns {string} - Formatted location string
   */
  formatIpAddress(ipAddress) {
    if (!ipAddress) return 'Unknown Location'

    // For local development
    if (
      ipAddress.includes('127.0.0.1') ||
      ipAddress.includes('::1') ||
      ipAddress.includes('localhost')
    ) {
      return 'Local Development'
    }

    // For private networks
    if (
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.')
    ) {
      return 'Private Network'
    }

    return `IP: ${ipAddress}`
  }

  /**
   * Start activity monitoring
   */
  startActivityMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(
      async () => {
        await this.checkSecurity()
      },
      5 * 60 * 1000,
    ) // Check every 5 minutes

    console.log('Session activity monitoring started')
  }

  /**
   * Stop activity monitoring
   */
  stopActivityMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('Session activity monitoring stopped')
  }

  /**
   * Clear all warnings
   */
  clearWarnings() {
    this.warnings.clear()
  }

  /**
   * Check if there are security warnings
   */
  hasWarnings() {
    return this.warnings.size > 0
  }

  /**
   * Get current warnings
   */
  getWarnings() {
    return Array.from(this.warnings)
  }

  /**
   * Check for security headers (simplified - no longer checking specific headers)
   */
  checkSecurityHeaders(response) {
    // This is a placeholder for compatibility with existing code
    // In the new system, security checks are done via API calls
    return true
  }
}

// Export singleton instance
const sessionService = new SessionService()
export default sessionService
