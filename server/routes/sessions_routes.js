import express from 'express'
import SessionManager from '../scripts/sessionManager.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'

const router = express.Router()

// Get all active sessions for current user
router.get('/active', authenticateAccessToken, async (req, res) => {
  try {
    const sessions = await SessionManager.getUserSessions(req.user.userId)

    const sessionData = sessions.map(session => ({
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === req.sessionId
    }))

    res.status(200).json({
      success: 'Active sessions retrieved',
      sessions: sessionData,
      totalCount: sessionData.length
    })
  } catch (error) {
    console.error('Error retrieving active sessions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Revoke a specific session
router.delete('/:sessionId', authenticateAccessToken, async (req, res) => {
  try {
    const { sessionId } = req.params
    const userId = req.user.userId

    // Verify the session belongs to the current user
    const session = await SessionManager.validateSession(sessionId, userId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found or already expired' })
    }

    const success = await SessionManager.revokeSession(sessionId, 'user_action')

    if (success) {
      res.status(200).json({
        success: 'Session revoked successfully',
        sessionId: sessionId
      })
    } else {
      res.status(400).json({ error: 'Failed to revoke session' })
    }
  } catch (error) {
    console.error('Error revoking session:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Revoke all sessions except current one
router.delete('/revoke-all/except-current', authenticateAccessToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const currentSessionId = req.sessionId

    // Get all active sessions
    const sessions = await SessionManager.getUserSessions(userId)

    // Revoke all sessions except the current one
    let revokedCount = 0
    for (const session of sessions) {
      if (session.sessionId !== currentSessionId) {
        const success = await SessionManager.revokeSession(session.sessionId, 'user_action')
        if (success) revokedCount++
      }
    }

    res.status(200).json({
      success: 'Sessions revoked successfully',
      revokedCount: revokedCount,
      message: `${revokedCount} other sessions have been terminated`
    })
  } catch (error) {
    console.error('Error revoking all sessions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Check for suspicious activity
router.get('/security-check', authenticateAccessToken, async (req, res) => {
  try {
    const suspiciousActivity = await SessionManager.checkSuspiciousActivity(req.user.userId)

    res.status(200).json({
      success: 'Security check completed',
      ...suspiciousActivity
    })
  } catch (error) {
    console.error('Error performing security check:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current session info
router.get('/current', authenticateAccessToken, async (req, res) => {
  try {
    const session = await SessionManager.validateSession(req.sessionId, req.user.userId)

    if (!session) {
      return res.status(404).json({ error: 'Current session not found' })
    }

    res.status(200).json({
      success: 'Current session retrieved',
      session: {
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      }
    })
  } catch (error) {
    console.error('Error retrieving current session:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
