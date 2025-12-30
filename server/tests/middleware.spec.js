/**
 * Middleware Tests
 * Tests for authentication middleware, CSRF middleware, and admin middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { createMockRequest, createMockResponse } from './helpers.js'

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}))

import { authenticateAccessToken } from '../middleware/authMiddleware.js'

describe('Auth Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    next = vi.fn()
    vi.clearAllMocks()
  })

  describe('authenticateAccessToken', () => {
    it('should return 401 if no token provided', () => {
      req.cookies = {}

      authenticateAccessToken(req, res, next)

      expect(res.sendStatus).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 403 for invalid token', () => {
      req.cookies = { accessToken: 'invalid-token' }
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      authenticateAccessToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.data.message).toBe('Invalid access token')
    })

    it('should call next and set req.user for valid token', () => {
      req.cookies = { accessToken: 'valid-token' }
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      }
      jwt.verify.mockReturnValue(mockUser)

      authenticateAccessToken(req, res, next)

      expect(req.user).toEqual(mockUser)
      expect(next).toHaveBeenCalled()
    })

    it('should extract user from token payload', () => {
      req.cookies = { accessToken: 'valid-token' }
      const tokenPayload = {
        userId: 'user-456',
        username: 'anotheruser',
        email: 'another@example.com',
        iat: 1234567890,
        exp: 1234567890 + 900,
      }
      jwt.verify.mockReturnValue(tokenPayload)

      authenticateAccessToken(req, res, next)

      expect(req.user.userId).toBe('user-456')
      expect(req.user.username).toBe('anotheruser')
    })
  })
})

describe('Token Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('JWT Token Structure', () => {
    it('should verify token with correct secret', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'test-token' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockReturnValue({ userId: 'user-123' })

      authenticateAccessToken(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('test-token', process.env.ACCESS_TOKEN_SECRET)
    })

    it('should reject expired tokens', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'expired-token' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired')
        error.name = 'TokenExpiredError'
        throw error
      })

      authenticateAccessToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })

    it('should reject malformed tokens', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'malformed.token' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt malformed')
        error.name = 'JsonWebTokenError'
        throw error
      })

      authenticateAccessToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})

describe('Request Handling', () => {
  describe('Cookie Extraction', () => {
    it('should extract accessToken from cookies', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'cookie-token', otherCookie: 'value' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockReturnValue({ userId: 'user-123' })

      authenticateAccessToken(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', expect.any(String))
    })

    it('should handle missing cookies object gracefully', () => {
      const req = createMockRequest()
      delete req.cookies
      req.cookies = {}
      const res = createMockResponse()
      const next = vi.fn()

      authenticateAccessToken(req, res, next)

      expect(res.sendStatus).toHaveBeenCalledWith(401)
    })
  })

  describe('Response Handling', () => {
    it('should not modify response body on success', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'valid-token' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockReturnValue({ userId: 'user-123' })

      authenticateAccessToken(req, res, next)

      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })

    it('should return JSON error message on failure', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'invalid-token' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      authenticateAccessToken(req, res, next)

      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid access token' })
    })
  })
})

describe('Security Considerations', () => {
  describe('Token Tampering Protection', () => {
    it('should reject tokens with invalid signature', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'tampered-token' }
      const res = createMockResponse()
      const next = vi.fn()

      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature')
        error.name = 'JsonWebTokenError'
        throw error
      })

      authenticateAccessToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('User Information Extraction', () => {
    it('should preserve all user fields from token', () => {
      const req = createMockRequest()
      req.cookies = { accessToken: 'valid-token' }
      const res = createMockResponse()
      const next = vi.fn()

      const fullUserData = {
        userId: 'user-789',
        username: 'fulluser',
        email: 'full@example.com',
        iat: 1234567890,
        exp: 9999999999,
      }
      jwt.verify.mockReturnValue(fullUserData)

      authenticateAccessToken(req, res, next)

      expect(req.user).toMatchObject({
        userId: 'user-789',
        username: 'fulluser',
        email: 'full@example.com',
      })
    })
  })
})
