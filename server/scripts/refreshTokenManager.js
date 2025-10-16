import RefreshToken from '../models/RefreshToken.js'
import { UAParser } from 'ua-parser-js'
import geoip from 'geoip-lite'

/**
 * RefreshToken Manager - Handles refresh token based activity tracking
 * Replaces session management with refresh token activity tracking
 */
class RefreshTokenManager {
  /**
   * Parse user agent string to extract device and browser info
   */
  static parseUserAgent(userAgentString) {
    const parser = new UAParser(userAgentString)
    const result = parser.getResult()
    return {
      browser: `${result.browser.name || 'Unknown'}`.trim(),
      device: result.device.type || 'Desktop',
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    }
  }

  /**
   * Get location info from IP address using geoip-lite
   */
  static getLocationFromIP(ipAddress) {
    try {
      // Skip location lookup for localhost/private IPs
      if (
        ipAddress === '127.0.0.1' ||
        ipAddress === '::1' ||
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.')
      ) {
        return 'Local'
      }

      const geo = geoip.lookup(ipAddress)
      if (geo) {
        return `${geo.city}, ${geo.country}`
      }
    } catch (error) {
      console.log('Error getting location from IP:', error.message)
    }

    return 'Unknown'
  }

  /**
   * Create refresh token with activity tracking
   */
  static async createRefreshToken(tokenData) {
    const { userId, token, sessionId, ipAddress, userAgent, expiresAt } = tokenData

    // Parse user agent for better tracking
    const agentInfo = this.parseUserAgent(userAgent)

    // Clean up old refresh tokens for this user (keep only 5 most recent)
    await this.cleanupOldTokens(userId, 5)

    const refreshToken = new RefreshToken({
      userId,
      token,
      sessionId,
      ipAddress,
      userAgent,
      location: this.getLocationFromIP(ipAddress),
      browser: agentInfo.browser,
      device: agentInfo.device,
      expiresAt,
      lastActivity: new Date(),
      activityCount: 1,
    })

    await refreshToken.save()
    return refreshToken
  }

  /**
   * Update token activity (called when token is used)
   */
  static async updateTokenActivity(token, ipAddress = null) {
    const refreshToken = await RefreshToken.findOne({ token, revoked: false })

    if (!refreshToken) {
      return null
    }

    // Update activity
    refreshToken.lastActivity = new Date()
    refreshToken.activityCount += 1

    // Update IP if provided and different
    if (ipAddress && ipAddress !== refreshToken.ipAddress) {
      console.log(
        `IP change detected for user ${refreshToken.userId}: ${refreshToken.ipAddress} -> ${ipAddress}`,
      )
      refreshToken.ipAddress = ipAddress
    }

    await refreshToken.save()
    return refreshToken
  }

  /**
   * Get all active refresh tokens for a user
   */
  static async getUserActiveTokens(userId) {
    return await RefreshToken.find({
      userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: -1 })
  }

  /**
   * Get token activity statistics for user (grouped by sessionId for active sessions)
   */
  static async getUserTokenStats(userId, refreshToken) {
    const activeTokens = await this.getUserActiveTokens(userId)

    // Group tokens by sessionId to get unique sessions
    const sessionMap = new Map()

    activeTokens.forEach((token) => {
      const sessionId = token.sessionId
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId: sessionId,
          ipAddress: token.ipAddress,
          location: token.location,
          browser: token.browser,
          device: token.device,
          lastActivity: token.lastActivity,
          totalActivity: token.activityCount,
          createdAt: token.createdAt,
          isCurrent: token.token === refreshToken,
          tokenCount: 1,
        })
      } else {
        // Update with most recent activity
        const existing = sessionMap.get(sessionId)
        if (token.lastActivity > existing.lastActivity) {
          existing.lastActivity = token.lastActivity
          existing.ipAddress = token.ipAddress
          existing.location = token.location
        }
        existing.totalActivity += token.activityCount
        existing.tokenCount += 1
        if (token.token === refreshToken) {
          existing.isCurrent = true
        }
      }
    })

    const uniqueSessions = Array.from(sessionMap.values())
    const uniqueIPs = [...new Set(activeTokens.map((token) => token.ipAddress))].length
    const totalActivity = activeTokens.reduce((sum, token) => sum + token.activityCount, 0)

    return {
      activeTokenCount: activeTokens.length,
      activeSessionCount: uniqueSessions.length, // New: count of unique sessions
      uniqueIPs,
      totalActivity,
      lastActivity: activeTokens.length > 0 ? activeTokens[0].lastActivity : null,
      sessions: uniqueSessions.sort((a, b) => b.lastActivity - a.lastActivity), // Sessions instead of individual tokens
      tokens: activeTokens.map((token) => ({
        id: token._id,
        sessionId: token.sessionId,
        ipAddress: token.ipAddress,
        location: token.location,
        browser: token.browser,
        device: token.device,
        lastActivity: token.lastActivity,
        activityCount: token.activityCount,
        createdAt: token.createdAt,
        isCurrent: token.token === refreshToken,
      })),
    }
  }

  /**
   * Check for suspicious activity
   */
  static async checkSuspiciousActivity(userId) {
    const activeTokens = await this.getUserActiveTokens(userId)
    const uniqueIPs = [...new Set(activeTokens.map((token) => token.ipAddress))]

    // Flag as suspicious if more than 3 different IPs in last 24 hours
    const recentTokens = activeTokens.filter(
      (token) => new Date() - token.createdAt < 24 * 60 * 60 * 1000,
    )
    const recentUniqueIPs = [...new Set(recentTokens.map((token) => token.ipAddress))]

    return {
      isSuspicious: recentUniqueIPs.length > 3,
      uniqueIPs: uniqueIPs.length,
      recentUniqueIPs: recentUniqueIPs.length,
      totalActiveTokens: activeTokens.length,
    }
  }

  // TODO: Implement this method to handle unauthorized access detection
  static async isUnauthorizedAccess(refreshTokens) {
    // const result = await RefreshToken.findOne({ token: refreshTokens, revoked: true })
    // if (!result) {
    //   return false
    // }
    // await this.revokeAllUserTokensExcept(result.userId, result.token, 'security')
    // return true
    return false
  }

  /**
   * Find an existing valid refresh token for a user, IP, and user agent
   */
  static async findExistingValidToken({ userId, ipAddress, userAgent }) {
    return await RefreshToken.findOne({
      userId,
      ipAddress,
      userAgent,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: -1 })
  }

  /**
   * Revoke a specific refresh token by token string
   */
  static async revokeTokenByString(tokenString, reason = 'user_logout') {
    const result = await RefreshToken.findOneAndUpdate(
      { token: tokenString, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true },
    )

    if (result) {
      console.log(`Token revoked. Reason: ${reason}`)
    }

    return result
  }

  /**
   * Revoke a specific refresh token
   */
  static async revokeToken(tokenId, reason = 'user_logout') {
    const result = await RefreshToken.findByIdAndUpdate(
      tokenId,
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true },
    )

    if (result) {
      console.log(`Token ${tokenId} revoked. Reason: ${reason}`)
    }

    return result
  }

  /**
   * Revoke all user's tokens except current one
   */
  static async revokeAllUserTokensExcept(userId, currentToken, reason = 'security') {
    const result = await RefreshToken.updateMany(
      {
        userId,
        token: { $ne: currentToken },
        revoked: false,
      },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    )

    console.log(`Revoked ${result.modifiedCount} tokens for user ${userId}. Reason: ${reason}`)
    return result
  }

  /**
   * Revoke all user's tokens
   */
  static async revokeAllUserTokens(userId, reason = 'user_logout') {
    const result = await RefreshToken.updateMany(
      {
        userId,
        revoked: false,
      },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    )

    console.log(`Revoked all ${result.modifiedCount} tokens for user ${userId}. Reason: ${reason}`)
    return result
  }

  /**
   * Revoke all tokens for a specific session
   */
  static async revokeSession(sessionId, reason = 'user_revoke') {
    const result = await RefreshToken.updateMany(
      { sessionId, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    )

    console.log(
      `Revoked session ${sessionId}. Tokens affected: ${result.modifiedCount}. Reason: ${reason}`,
    )
    return result
  }

  /**
   * Clean up old tokens (keep only specified number of most recent)
   */
  static async cleanupOldTokens(userId, keepCount = 5) {
    const allTokens = await RefreshToken.find({ userId }).sort({ createdAt: -1 })

    if (allTokens.length > keepCount) {
      const tokensToDelete = allTokens.slice(keepCount)
      const tokenIds = tokensToDelete.map((token) => token._id)

      await RefreshToken.deleteMany({ _id: { $in: tokenIds } })
      console.log(`Cleaned up ${tokenIds.length} old tokens for user ${userId}`)
    }
  }

  /**
   * Clean up expired tokens (scheduled cleanup)
   */
  static async cleanupExpiredTokens() {
    const result = await RefreshToken.deleteMany({
      expiresAt: { $lt: new Date() },
    })

    console.log(`Cleaned up ${result.deletedCount} expired refresh tokens`)
    return result
  }

  /**
   * Get token by token string
   */
  static async getTokenByString(tokenString) {
    return await RefreshToken.findOne({
      token: tokenString,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
  }
}

export default RefreshTokenManager
