import RefreshToken from '../models/RefreshToken.js'
import { UAParser } from 'ua-parser-js'
import geoip from 'geoip-lite'
import crypto from 'crypto'
import { recordSecurityEvent } from './securityEventService.js'

const IMPOSSIBLE_TRAVEL_SPEED_THRESHOLD_KMH = 900

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
        return { label: 'Local', latitude: null, longitude: null }
      }

      const geo = geoip.lookup(ipAddress)
      if (geo) {
        return {
          label: `${geo.city || 'Unknown City'}, ${geo.country}`,
          latitude: Array.isArray(geo.ll) ? geo.ll[0] : null,
          longitude: Array.isArray(geo.ll) ? geo.ll[1] : null,
        }
      }
    } catch (error) {
      console.log('Error getting location from IP:', error.message)
    }

    return { label: 'Unknown', latitude: null, longitude: null }
  }

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Create refresh token with activity tracking
   */
  static async createRefreshToken(tokenData) {
    const {
      userId,
      token,
      sessionId,
      ipAddress,
      userAgent,
      expiresAt,
      deviceFingerprint = null,
    } = tokenData

    // Parse user agent for better tracking
    const agentInfo = this.parseUserAgent(userAgent)
    const locationInfo = this.getLocationFromIP(ipAddress)

    // Clean up old refresh tokens for this user (keep only 5 most recent)
    await this.cleanupOldTokens(userId, 5)

    const refreshToken = new RefreshToken({
      userId,
      tokenHash: this.hashToken(token),
      sessionId,
      ipAddress,
      userAgent,
      location: locationInfo.label,
      locationLat: locationInfo.latitude,
      locationLon: locationInfo.longitude,
      browser: agentInfo.browser,
      device: agentInfo.device,
      expiresAt,
      lastActivity: new Date(),
      activityCount: 1,
      deviceFingerprint,
    })

    await refreshToken.save()
    await this.analyzeTokenSecurity(refreshToken)
    return refreshToken
  }

  /**
   * Update token activity (called when token is used)
   */
  static async updateTokenActivity(token, ipAddress = null) {
    const refreshToken = await RefreshToken.findOne({
      tokenHash: this.hashToken(token),
      revoked: false,
    })

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
      const locationInfo = this.getLocationFromIP(ipAddress)
      refreshToken.location = locationInfo.label
      refreshToken.locationLat = locationInfo.latitude
      refreshToken.locationLon = locationInfo.longitude
    }

    await refreshToken.save()
    await this.analyzeTokenSecurity(refreshToken)
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
    const currentTokenHash = refreshToken ? this.hashToken(refreshToken) : null

    // Group tokens by sessionId to get unique sessions
    const sessionMap = new Map()

    activeTokens.forEach((token) => {
      const sessionId = token.sessionId
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId: sessionId,
          ipAddress: token.ipAddress,
          location: token.location,
          locationLat: token.locationLat,
          locationLon: token.locationLon,
          browser: token.browser,
          device: token.device,
          lastActivity: token.lastActivity,
          totalActivity: token.activityCount,
          createdAt: token.createdAt,
          isCurrent: token.tokenHash === currentTokenHash,
          tokenCount: 1,
          deviceFingerprint: token.deviceFingerprint,
          riskFlags: token.riskFlags,
        })
      } else {
        // Update with most recent activity
        const existing = sessionMap.get(sessionId)
        if (token.lastActivity > existing.lastActivity) {
          existing.lastActivity = token.lastActivity
          existing.ipAddress = token.ipAddress
          existing.location = token.location
          existing.locationLat = token.locationLat
          existing.locationLon = token.locationLon
        }
        existing.totalActivity += token.activityCount
        existing.tokenCount += 1
        if (token.tokenHash === currentTokenHash) {
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
        locationLat: token.locationLat,
        locationLon: token.locationLon,
        browser: token.browser,
        device: token.device,
        lastActivity: token.lastActivity,
        activityCount: token.activityCount,
        createdAt: token.createdAt,
        isCurrent: token.tokenHash === currentTokenHash,
        deviceFingerprint: token.deviceFingerprint,
        riskFlags: token.riskFlags,
      })),
    }
  }

  /**
   * Check for suspicious activity
   */
  static async checkSuspiciousActivity(userId) {
    const activeTokens = await this.getUserActiveTokens(userId)
    const uniqueIPs = [...new Set(activeTokens.map((token) => token.ipAddress))]
    const uniqueFingerprints = [
      ...new Set(activeTokens.map((token) => token.deviceFingerprint).filter(Boolean)),
    ]

    // Flag as suspicious if more than 3 different IPs in last 24 hours
    const recentTokens = activeTokens.filter(
      (token) => new Date() - token.createdAt < 24 * 60 * 60 * 1000,
    )
    const recentUniqueIPs = [...new Set(recentTokens.map((token) => token.ipAddress))]
    const recentUniqueFingerprints = [
      ...new Set(recentTokens.map((token) => token.deviceFingerprint).filter(Boolean)),
    ]

    const impossibleTravel = this.detectImpossibleTravel(activeTokens)

    return {
      isSuspicious: recentUniqueIPs.length > 3 || impossibleTravel.isImpossible,
      uniqueIPs: uniqueIPs.length,
      recentUniqueIPs: recentUniqueIPs.length,
      uniqueDeviceFingerprints: uniqueFingerprints.length,
      recentUniqueDeviceFingerprints: recentUniqueFingerprints.length,
      totalActiveTokens: activeTokens.length,
      impossibleTravel: impossibleTravel,
    }
  }

  static async isUnauthorizedAccess(refreshTokens) {
    if (!refreshTokens) {
      return false
    }

    const tokenHash = this.hashToken(refreshTokens)
    const compromisedToken = await RefreshToken.findOne({ tokenHash })
    if (compromisedToken && compromisedToken.revoked) {
      await this.revokeAllUserTokens(compromisedToken.userId, 'security')
      return true
    }

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
      { tokenHash: this.hashToken(tokenString), revoked: false },
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
    const currentTokenHash = this.hashToken(currentToken)
    const result = await RefreshToken.updateMany(
      {
        userId,
        tokenHash: { $ne: currentTokenHash },
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
      tokenHash: this.hashToken(tokenString),
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
  }

  static calculateDistanceInKm(lat1, lon1, lat2, lon2) {
    if (
      lat1 === null ||
      lon1 === null ||
      lat2 === null ||
      lon2 === null ||
      typeof lat1 === 'undefined' ||
      typeof lon1 === 'undefined' ||
      typeof lat2 === 'undefined' ||
      typeof lon2 === 'undefined'
    ) {
      return 0
    }

    const toRad = (value) => (value * Math.PI) / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  static detectImpossibleTravel(tokens) {
    const sortedTokens = tokens
      .filter((token) => token.locationLat !== null && token.locationLon !== null)
      .sort((a, b) => b.lastActivity - a.lastActivity)

    const flaggedPairs = []

    for (let i = 0; i < sortedTokens.length - 1; i++) {
      const current = sortedTokens[i]
      for (let j = i + 1; j < sortedTokens.length; j++) {
        const previous = sortedTokens[j]
        const timeDiffHours = Math.abs(current.lastActivity - previous.lastActivity) / (1000 * 60 * 60)

        if (timeDiffHours === 0) {
          continue
        }

        const distanceKm = this.calculateDistanceInKm(
          current.locationLat,
          current.locationLon,
          previous.locationLat,
          previous.locationLon,
        )

        const speed = distanceKm / timeDiffHours

        if (speed > IMPOSSIBLE_TRAVEL_SPEED_THRESHOLD_KMH) {
          flaggedPairs.push({
            currentSessionId: current.sessionId,
            previousSessionId: previous.sessionId,
            distanceKm,
            speedKmh: speed,
            timeDiffHours,
          })
        }
      }
    }

    return {
      isImpossible: flaggedPairs.length > 0,
      flaggedPairs,
    }
  }

  static async analyzeTokenSecurity(refreshToken) {
    const previousRiskFlags = new Set(refreshToken.riskFlags || [])
    const updatedRiskFlags = new Set(refreshToken.riskFlags || [])

    const suspiciousActivity = await this.checkSuspiciousActivity(refreshToken.userId)

    if (suspiciousActivity.impossibleTravel.isImpossible) {
      updatedRiskFlags.add('impossible_travel')
    }

    const activeTokens = await this.getUserActiveTokens(refreshToken.userId)
    const deviceOccurrences = activeTokens.filter(
      (token) =>
        token.deviceFingerprint && token.deviceFingerprint === refreshToken.deviceFingerprint,
    )

    if (refreshToken.deviceFingerprint && deviceOccurrences.length === 1) {
      updatedRiskFlags.add('new_device')
    }

    refreshToken.riskFlags = Array.from(updatedRiskFlags)
    await refreshToken.save()

    if (!previousRiskFlags.has('impossible_travel') && updatedRiskFlags.has('impossible_travel')) {
      await recordSecurityEvent({
        userId: refreshToken.userId,
        type: 'impossible_travel',
        severity: 'high',
        description: 'Login detected from multiple distant locations within a short time frame.',
        metadata: {
          sessionId: refreshToken.sessionId,
          ipAddress: refreshToken.ipAddress,
          location: refreshToken.location,
        },
        notifyUser: true,
        notifyAdmins: true,
      })
    } else if (!previousRiskFlags.has('new_device') && updatedRiskFlags.has('new_device')) {
      await recordSecurityEvent({
        userId: refreshToken.userId,
        type: 'new_device',
        severity: 'medium',
        description: 'New device fingerprint detected for your account.',
        metadata: {
          sessionId: refreshToken.sessionId,
          ipAddress: refreshToken.ipAddress,
          location: refreshToken.location,
        },
        notifyUser: true,
        notifyAdmins: false,
      })
    }
  }
}

export default RefreshTokenManager
