import Session from '../models/Session.js'
import { randomBytes } from 'crypto'

class SessionManager {
  // Create a new session
  static async createSession(userId, refreshToken, req) {
    try {
      // Revoke any existing active sessions for this user (optional - for single session per user)
      // await Session.updateMany(
      //   { userId, isActive: true },
      //   { isActive: false, revokedAt: new Date(), revokedReason: 'duplicate' }
      // )

      const sessionId = randomBytes(32).toString('hex')
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
      const userAgent = req.headers['user-agent'] || 'Unknown'

      const session = new Session({
        sessionId,
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      })

      await session.save()
      console.log(`Session created: ${sessionId} for user: ${userId}`)
      return session
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }

  // Validate session
  static async validateSession(sessionId, userId = null) {
    try {
      const query = {
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }

      if (userId) {
        query.userId = userId
      }

      const session = await Session.findOne(query)

      if (session) {
        // Update last activity
        session.lastActivity = new Date()
        await session.save()
        return session
      }

      return null
    } catch (error) {
      console.error('Error validating session:', error)
      return null
    }
  }

  // Revoke session
  static async revokeSession(sessionId, reason = 'logout') {
    try {
      const result = await Session.updateOne(
        { sessionId },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason
        }
      )

      console.log(`Session revoked: ${sessionId}, reason: ${reason}`)
      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error revoking session:', error)
      return false
    }
  }

  // Revoke all user sessions
  static async revokeAllUserSessions(userId, reason = 'security') {
    try {
      const result = await Session.updateMany(
        { userId, isActive: true },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason
        }
      )

      console.log(`All sessions revoked for user: ${userId}, count: ${result.modifiedCount}`)
      return result.modifiedCount
    } catch (error) {
      console.error('Error revoking all user sessions:', error)
      return 0
    }
  }

  // Get active sessions for user
  static async getUserSessions(userId) {
    try {
      return await Session.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 })
    } catch (error) {
      console.error('Error getting user sessions:', error)
      return []
    }
  }

  // Clean up expired sessions (can be called periodically)
  static async cleanupExpiredSessions() {
    try {
      const result = await Session.updateMany(
        {
          expiresAt: { $lt: new Date() },
          isActive: true
        },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'timeout'
        }
      )

      console.log(`Cleaned up ${result.modifiedCount} expired sessions`)
      return result.modifiedCount
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error)
      return 0
    }
  }

  // Update session activity
  static async updateSessionActivity(sessionId) {
    try {
      await Session.updateOne(
        { sessionId, isActive: true },
        { lastActivity: new Date() }
      )
    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }

  // Update session refresh token (for profile updates)
  static async updateSessionToken(sessionId, newRefreshToken) {
    try {
      const result = await Session.updateOne(
        { sessionId, isActive: true },
        {
          refreshToken: newRefreshToken,
          lastActivity: new Date()
        }
      )

      console.log(`Session token updated: ${sessionId}`)
      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error updating session token:', error)
      return false
    }
  }

  // Check for suspicious activity (multiple sessions from different IPs)
  static async checkSuspiciousActivity(userId) {
    try {
      const sessions = await Session.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      })

      // Group by IP address
      const ipGroups = sessions.reduce((acc, session) => {
        if (!acc[session.ipAddress]) {
          acc[session.ipAddress] = []
        }
        acc[session.ipAddress].push(session)
        return acc
      }, {})

      const uniqueIPs = Object.keys(ipGroups).length

      // Flag as suspicious if more than 3 different IPs
      return {
        isSuspicious: uniqueIPs > 3,
        sessionCount: sessions.length,
        uniqueIPs,
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          lastActivity: s.lastActivity,
          createdAt: s.createdAt
        }))
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error)
      return { isSuspicious: false, sessionCount: 0, uniqueIPs: 0, sessions: [] }
    }
  }
}

export default SessionManager
