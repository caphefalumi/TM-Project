import RefreshTokenManager from '../scripts/refreshTokenManager.js'

export const getActiveTokens = async (req, res) => {
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
    console.log('Error fetching active tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getSecurityStatus = async (req, res) => {
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
    console.log('Error checking security:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteTokenById = async (req, res) => {
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
    console.log('Error revoking token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteOtherTokens = async (req, res) => {
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
    console.log('Error revoking other tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
