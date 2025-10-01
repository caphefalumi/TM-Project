import express from 'express'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import {
  addRefreshToken,
  revokeRefreshToken,
  renewAccessToken,
} from '../controllers/tokensController.js'

const router = express.Router()

router.get('/active', authenticateAccessToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const refreshToken = req.cookies.refreshToken
    const stats = await RefreshTokenManager.getUserTokenStats(userId, refreshToken)

    res.status(200).json({
      success: true,
      totalCount: stats.activeTokenCount,
      sessionCount: stats.activeSessionCount,
      uniqueIPs: stats.uniqueIPs,
      totalActivity: stats.totalActivity,
      lastActivity: stats.lastActivity,
      sessions: stats.sessions,
      tokens: stats.tokens,
    })
  } catch (error) {
    console.error('Error fetching active tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

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
      details: suspiciousActivity,
    })
  } catch (error) {
    console.error('Error checking security:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/me', addRefreshToken)
router.delete('/me', revokeRefreshToken)
router.post('/refresh', renewAccessToken)

router.delete('/:tokenId', authenticateAccessToken, async (req, res) => {
  try {
    const { tokenId } = req.params
    const userId = req.user.userId

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
      message: 'Session ended successfully',
    })
  } catch (error) {
    console.error('Error revoking token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/others/all', authenticateAccessToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const currentToken = req.cookies.refreshToken

    if (!currentToken) {
      return res.status(401).json({ error: 'No current token found' })
    }

    const result = await RefreshTokenManager.revokeAllUserTokensExcept(
      userId,
      currentToken,
      'security',
    )

    res.status(200).json({
      success: true,
      message: `Ended ${result.modifiedCount} other sessions`,
      count: result.modifiedCount,
    })
  } catch (error) {
    console.error('Error revoking other tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
