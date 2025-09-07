import express from 'express'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'

const router = express.Router()

/**
 * Get user's active refresh tokens (session-like data)
 */
router.get('/active', authenticateAccessToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const stats = await RefreshTokenManager.getUserTokenStats(userId)

    res.status(200).json({
      success: true,
      totalCount: stats.activeTokenCount,
      uniqueIPs: stats.uniqueIPs,
      totalActivity: stats.totalActivity,
      lastActivity: stats.lastActivity,
      tokens: stats.tokens
    })
  } catch (error) {
    console.error('Error fetching active tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get current token info
 */
router.get('/current', authenticateAccessToken, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token found' })
    }

    const tokenData = await RefreshTokenManager.getTokenByString(refreshToken)
    if (!tokenData) {
      return res.status(404).json({ error: 'Token not found' })
    }

    res.status(200).json({
      success: true,
      session: {
        id: tokenData._id,
        ipAddress: tokenData.ipAddress,
        browser: tokenData.browser,
        device: tokenData.device,
        lastActivity: tokenData.lastActivity,
        activityCount: tokenData.activityCount,
        createdAt: tokenData.createdAt
      }
    })
  } catch (error) {
    console.error('Error fetching current token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Check for security issues
 */
router.get('/security', authenticateAccessToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const suspiciousActivity = await RefreshTokenManager.checkSuspiciousActivity(userId)
    const stats = await RefreshTokenManager.getUserTokenStats(userId)

    res.status(200).json({
      success: true,
      isSuspicious: suspiciousActivity.isSuspicious,
      uniqueIPs: stats.uniqueIPs,
      activeTokenCount: stats.activeTokenCount,
      recentUniqueIPs: suspiciousActivity.recentUniqueIPs,
      details: suspiciousActivity
    })
  } catch (error) {
    console.error('Error checking security:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Revoke a specific token
 */
router.delete('/:tokenId', authenticateAccessToken, async (req, res) => {
  try {
    const { tokenId } = req.params
    const userId = req.user.userId

    // Verify the token belongs to the user
    const token = await RefreshTokenManager.getTokenByString(req.cookies.refreshToken)
    if (!token || token.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const result = await RefreshTokenManager.revokeToken(tokenId, 'user_revoke')

    if (!result) {
      return res.status(404).json({ error: 'Token not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Session ended successfully'
    })
  } catch (error) {
    console.error('Error revoking token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Revoke all other tokens except current
 */
router.delete('/others/all', authenticateAccessToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const currentToken = req.cookies.refreshToken

    if (!currentToken) {
      return res.status(401).json({ error: 'No current token found' })
    }

    const result = await RefreshTokenManager.revokeAllUserTokensExcept(userId, currentToken, 'security')

    res.status(200).json({
      success: true,
      message: `Ended ${result.modifiedCount} other sessions`,
      count: result.modifiedCount
    })
  } catch (error) {
    console.error('Error revoking other tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
