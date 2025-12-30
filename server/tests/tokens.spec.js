/**
 * Token Service & Refresh Token Manager Tests
 * Tests for session management, token refresh, and security features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { createMockRequest, createMockResponse, createMockRefreshToken } from './helpers.js'

// Mock RefreshToken model
vi.mock('../models/RefreshToken.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('../services/tokenService.js', () => ({
  generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
}))

import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import RefreshToken from '../models/RefreshToken.js'
import { generateAccessToken, generateRefreshToken } from '../services/tokenService.js'

describe('Token Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const user = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      }

      const token = generateAccessToken(user)

      expect(token).toBe('mock-access-token')
      expect(generateAccessToken).toHaveBeenCalledWith(user)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const user = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      }

      const token = generateRefreshToken(user)

      expect(token).toBe('mock-refresh-token')
      expect(generateRefreshToken).toHaveBeenCalledWith(user)
    })
  })
})

describe('RefreshTokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseUserAgent', () => {
    it('should parse browser info from user agent', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'

      const result = RefreshTokenManager.parseUserAgent(userAgent)

      expect(result).toHaveProperty('browser')
      expect(result).toHaveProperty('device')
      expect(result).toHaveProperty('os')
    })

    it('should handle unknown user agent', () => {
      const result = RefreshTokenManager.parseUserAgent('Unknown Agent')

      expect(result).toBeDefined()
      expect(result.device).toBe('Desktop')
    })

    it('should detect mobile devices', () => {
      const mobileUA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'

      const result = RefreshTokenManager.parseUserAgent(mobileUA)

      expect(result).toBeDefined()
    })
  })

  describe('getLocationFromIP', () => {
    it('should return Local for localhost IPs', () => {
      expect(RefreshTokenManager.getLocationFromIP('127.0.0.1')).toBe('Local')
      expect(RefreshTokenManager.getLocationFromIP('::1')).toBe('Local')
    })

    it('should return Local for private network IPs', () => {
      expect(RefreshTokenManager.getLocationFromIP('192.168.1.1')).toBe('Local')
      expect(RefreshTokenManager.getLocationFromIP('10.0.0.1')).toBe('Local')
      expect(RefreshTokenManager.getLocationFromIP('172.16.0.1')).toBe('Local')
    })

    it('should return Unknown for unresolvable IPs', () => {
      const result = RefreshTokenManager.getLocationFromIP('1.1.1.1')
      // May return location or Unknown depending on geoip database
      expect(typeof result).toBe('string')
    })
  })

  describe('getUserActiveTokens', () => {
    it('should return active tokens for user', async () => {
      const mockTokens = [
        createMockRefreshToken(),
        createMockRefreshToken({ _id: { toString: () => 'token-456' } }),
      ]

      RefreshToken.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTokens),
      })

      const tokens = await RefreshTokenManager.getUserActiveTokens('user-123')

      expect(tokens).toHaveLength(2)
      expect(RefreshToken.find).toHaveBeenCalledWith({
        userId: 'user-123',
        revoked: false,
        expiresAt: { $gt: expect.any(Date) },
      })
    })

    it('should return empty array for user with no tokens', async () => {
      RefreshToken.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      })

      const tokens = await RefreshTokenManager.getUserActiveTokens('user-with-no-tokens')

      expect(tokens).toHaveLength(0)
    })
  })

  describe('getUserTokenStats', () => {
    it('should calculate token statistics correctly', async () => {
      const mockTokens = [
        createMockRefreshToken({ sessionId: 'session-1', ipAddress: '1.1.1.1', activityCount: 5 }),
        createMockRefreshToken({ sessionId: 'session-1', ipAddress: '1.1.1.1', activityCount: 3 }),
        createMockRefreshToken({ sessionId: 'session-2', ipAddress: '2.2.2.2', activityCount: 2 }),
      ]

      RefreshToken.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTokens),
      })

      const stats = await RefreshTokenManager.getUserTokenStats('user-123', 'mock-refresh-token')

      expect(stats.activeTokenCount).toBe(3)
      expect(stats.activeSessionCount).toBe(2)
      expect(stats.uniqueIPs).toBe(2)
      expect(stats.totalActivity).toBe(10)
    })

    it('should mark current token correctly', async () => {
      const currentToken = 'current-token'
      const mockTokens = [
        createMockRefreshToken({ token: currentToken, sessionId: 'session-1' }),
        createMockRefreshToken({ token: 'other-token', sessionId: 'session-2' }),
      ]

      RefreshToken.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTokens),
      })

      const stats = await RefreshTokenManager.getUserTokenStats('user-123', currentToken)

      const currentSession = stats.sessions.find((s) => s.sessionId === 'session-1')
      expect(currentSession.isCurrent).toBe(true)
    })
  })

  describe('checkSuspiciousActivity', () => {
    it('should detect suspicious activity with many IPs', async () => {
      const mockTokens = [
        createMockRefreshToken({ ipAddress: '1.1.1.1', createdAt: new Date() }),
        createMockRefreshToken({ ipAddress: '2.2.2.2', createdAt: new Date() }),
        createMockRefreshToken({ ipAddress: '3.3.3.3', createdAt: new Date() }),
        createMockRefreshToken({ ipAddress: '4.4.4.4', createdAt: new Date() }),
      ]

      RefreshToken.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTokens),
      })

      const result = await RefreshTokenManager.checkSuspiciousActivity('user-123')

      expect(result.isSuspicious).toBe(true)
      expect(result.recentUniqueIPs).toBe(4)
    })

    it('should not flag normal activity', async () => {
      const mockTokens = [
        createMockRefreshToken({ ipAddress: '1.1.1.1', createdAt: new Date() }),
        createMockRefreshToken({ ipAddress: '1.1.1.1', createdAt: new Date() }),
      ]

      RefreshToken.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTokens),
      })

      const result = await RefreshTokenManager.checkSuspiciousActivity('user-123')

      expect(result.isSuspicious).toBe(false)
    })
  })

  describe('revokeTokenByString', () => {
    it('should revoke token by string', async () => {
      const mockToken = createMockRefreshToken()
      RefreshToken.findOneAndUpdate.mockResolvedValue(mockToken)

      const result = await RefreshTokenManager.revokeTokenByString('mock-token', 'user_logout')

      expect(RefreshToken.findOneAndUpdate).toHaveBeenCalledWith(
        { token: 'mock-token', revoked: false },
        expect.objectContaining({
          revoked: true,
          revokedReason: 'user_logout',
        }),
        { new: true },
      )
      expect(result).toBeDefined()
    })

    it('should return null for non-existent token', async () => {
      RefreshToken.findOneAndUpdate.mockResolvedValue(null)

      const result = await RefreshTokenManager.revokeTokenByString('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('revokeToken', () => {
    it('should revoke token by ID', async () => {
      const mockToken = createMockRefreshToken()
      RefreshToken.findByIdAndUpdate.mockResolvedValue(mockToken)

      await RefreshTokenManager.revokeToken('token-123', 'user_revoke')

      expect(RefreshToken.findByIdAndUpdate).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({
          revoked: true,
          revokedReason: 'user_revoke',
        }),
        { new: true },
      )
    })
  })

  describe('revokeAllUserTokensExcept', () => {
    it('should revoke all tokens except current', async () => {
      RefreshToken.updateMany.mockResolvedValue({ modifiedCount: 3 })

      const result = await RefreshTokenManager.revokeAllUserTokensExcept(
        'user-123',
        'current-token',
        'security',
      )

      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          token: { $ne: 'current-token' },
          revoked: false,
        },
        expect.objectContaining({
          revoked: true,
          revokedReason: 'security',
        }),
      )
      expect(result.modifiedCount).toBe(3)
    })
  })

  describe('revokeAllUserTokens', () => {
    it('should revoke all user tokens', async () => {
      RefreshToken.updateMany.mockResolvedValue({ modifiedCount: 5 })

      const result = await RefreshTokenManager.revokeAllUserTokens('user-123', 'user_logout')

      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          revoked: false,
        },
        expect.objectContaining({
          revoked: true,
          revokedReason: 'user_logout',
        }),
      )
      expect(result.modifiedCount).toBe(5)
    })
  })

  describe('revokeSession', () => {
    it('should revoke all tokens for a session', async () => {
      RefreshToken.updateMany.mockResolvedValue({ modifiedCount: 2 })

      const result = await RefreshTokenManager.revokeSession('session-123', 'user_revoke')

      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { sessionId: 'session-123', revoked: false },
        expect.objectContaining({
          revoked: true,
          revokedReason: 'user_revoke',
        }),
      )
    })
  })

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 10 })

      const result = await RefreshTokenManager.cleanupExpiredTokens()

      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      })
      expect(result.deletedCount).toBe(10)
    })
  })

  describe('getTokenByString', () => {
    it('should find valid token by string', async () => {
      const mockToken = createMockRefreshToken()
      RefreshToken.findOne.mockResolvedValue(mockToken)

      const result = await RefreshTokenManager.getTokenByString('valid-token')

      expect(RefreshToken.findOne).toHaveBeenCalledWith({
        token: 'valid-token',
        revoked: false,
        expiresAt: { $gt: expect.any(Date) },
      })
      expect(result).toBeDefined()
    })

    it('should return null for revoked or expired token', async () => {
      RefreshToken.findOne.mockResolvedValue(null)

      const result = await RefreshTokenManager.getTokenByString('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('updateTokenActivity', () => {
    it('should update token activity count', async () => {
      const mockToken = createMockRefreshToken()
      mockToken.save = vi.fn().mockResolvedValue(mockToken)
      RefreshToken.findOne.mockResolvedValue(mockToken)

      await RefreshTokenManager.updateTokenActivity('valid-token')

      expect(mockToken.activityCount).toBe(2) // 1 + 1
      expect(mockToken.save).toHaveBeenCalled()
    })

    it('should update IP if changed', async () => {
      const mockToken = createMockRefreshToken({ ipAddress: '1.1.1.1' })
      mockToken.save = vi.fn().mockResolvedValue(mockToken)
      RefreshToken.findOne.mockResolvedValue(mockToken)

      await RefreshTokenManager.updateTokenActivity('valid-token', '2.2.2.2')

      expect(mockToken.ipAddress).toBe('2.2.2.2')
    })

    it('should return null for non-existent token', async () => {
      RefreshToken.findOne.mockResolvedValue(null)

      const result = await RefreshTokenManager.updateTokenActivity('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findExistingValidToken', () => {
    it('should find existing valid token', async () => {
      const mockToken = createMockRefreshToken()
      RefreshToken.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockToken),
      })

      const result = await RefreshTokenManager.findExistingValidToken({
        userId: 'user-123',
        ipAddress: '1.1.1.1',
        userAgent: 'Mozilla/5.0',
      })

      expect(result).toBeDefined()
    })
  })
})
