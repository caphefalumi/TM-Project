import SessionManager from './sessionManager.js'
import cron from 'node-cron'

class SessionCleanup {
  // Manual cleanup function
  static async cleanupExpiredSessions() {
    try {
      console.log('Starting session cleanup...')
      const cleanedCount = await SessionManager.cleanupExpiredSessions()
      console.log(`Session cleanup completed. Cleaned ${cleanedCount} expired sessions.`)
      return cleanedCount
    } catch (error) {
      console.error('Error during session cleanup:', error)
      return 0
    }
  }

  // Start automatic cleanup scheduler
  static startScheduler() {
    // Run cleanup every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Running scheduled session cleanup...')
      await this.cleanupExpiredSessions()
    })

    console.log('Session cleanup scheduler started (runs every hour)')
  }

  // Cleanup sessions for a specific user (useful for security incidents)
  static async emergencyUserCleanup(userId, reason = 'security_incident') {
    try {
      console.log(`Emergency cleanup for user ${userId}, reason: ${reason}`)
      const revokedCount = await SessionManager.revokeAllUserSessions(userId, reason)
      console.log(`Emergency cleanup completed. Revoked ${revokedCount} sessions for user ${userId}`)
      return revokedCount
    } catch (error) {
      console.error(`Error during emergency cleanup for user ${userId}:`, error)
      return 0
    }
  }

  // Get session statistics
  static async getSessionStats() {
    try {
      // This would require additional queries to Session model
      // For now, return basic info from SessionManager
      return {
        message: 'Session statistics would require additional database queries',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting session statistics:', error)
      return { error: 'Failed to get session statistics' }
    }
  }
}

export default SessionCleanup
