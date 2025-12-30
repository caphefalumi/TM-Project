/**
 * Authentication Controller Tests
 * Tests for Google OAuth, local login/register, password reset, and email verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockResponse, createMockUser } from './helpers.js'

// Mock dependencies
vi.mock('../models/Account.js', () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('../models/Tasks.js', () => ({
  default: {
    insertMany: vi.fn(),
  },
}))

vi.mock('../scripts/mailer.js', () => ({
  default: {
    sendVerificationEmail: vi.fn().mockResolvedValue(true),
    sendResetPasswordEmail: vi.fn().mockResolvedValue(true),
    sendPasswordResetConfirmationEmail: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('../scripts/refreshTokenManager.js', () => ({
  default: {
    checkSuspiciousActivity: vi.fn().mockResolvedValue({ isSuspicious: false }),
    revokeAllUserTokens: vi.fn(),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    genSalt: vi.fn().mockResolvedValue('salt'),
    hash: vi.fn().mockResolvedValue('hashed'),
  },
}))

vi.mock('../controllers/teamsController.js', () => ({
  default: {
    addTeamPro: vi.fn().mockImplementation((req, res) => {
      res.status(200).json({ teamId: 'mock-team-id' })
    }),
  },
}))

import AuthController from '../controllers/authController.js'
import Account from '../models/Account.js'
import Mailer from '../scripts/mailer.js'
import bcrypt from 'bcryptjs'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'

describe('AuthController', () => {
  let req, res

  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    vi.clearAllMocks()
  })

  describe('oAuthentication - Google OAuth Check', () => {
    it('should return 400 if no access token provided', async () => {
      req.body = {}

      await AuthController.oAuthentication(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('No access token provided')
    })

    it('should return register success for new user', async () => {
      req.body = { token: 'google-access-token' }

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ email: 'newuser@example.com' }),
      })

      Account.findOne.mockResolvedValue(null)

      await AuthController.oAuthentication(req, res)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.data.success).toBe('register')
    })

    it('should return login success for existing user', async () => {
      req.body = { token: 'google-access-token' }
      const mockUser = createMockUser()

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ email: mockUser.email }),
      })

      Account.findOne.mockResolvedValue(mockUser)

      await AuthController.oAuthentication(req, res)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.data.success).toBe('login')
      expect(res.data.username).toBe(mockUser.username)
    })
  })

  describe('oAuthenticationRegister - Google OAuth Register', () => {
    it('should return 400 if username is missing', async () => {
      req.body = { token: 'google-token' }

      await AuthController.oAuthenticationRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Username is required')
    })

    it('should return 400 if token is missing', async () => {
      req.body = { username: 'testuser' }

      await AuthController.oAuthenticationRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('No access token provided')
    })

    it('should return 402 if username already exists', async () => {
      req.body = { username: 'existinguser', token: 'google-token' }

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ email: 'new@example.com' }),
      })

      Account.findOne.mockResolvedValue(createMockUser({ username: 'existinguser' }))

      await AuthController.oAuthenticationRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(402)
      expect(res.data.error).toBe('Username already exists.')
    })

    it('should return 403 if email already exists', async () => {
      req.body = { username: 'newuser', token: 'google-token' }

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ email: 'existing@example.com' }),
      })

      Account.findOne.mockResolvedValue(createMockUser({ email: 'existing@example.com' }))

      await AuthController.oAuthenticationRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.data.error).toBe('Email already exists.')
    })
  })

  describe('localRegister - Password Registration', () => {
    it('should return 400 if fields are missing', async () => {
      req.body = { username: 'test' }

      await AuthController.localRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('All fields are required.')
    })

    it('should return 400 if password is too short', async () => {
      req.body = { username: 'test', email: 'test@example.com', password: '12345' }

      await AuthController.localRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Password must be at least 6 characters.')
    })

    it('should return 400 if username already exists', async () => {
      req.body = { username: 'existinguser', email: 'new@example.com', password: 'password123' }

      Account.findOne.mockResolvedValue(createMockUser({ username: 'existinguser' }))

      await AuthController.localRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Username already exists.')
    })

    it('should return 400 if email already exists', async () => {
      req.body = { username: 'newuser', email: 'existing@example.com', password: 'password123' }

      Account.findOne.mockResolvedValue(createMockUser({ email: 'existing@example.com' }))

      await AuthController.localRegister(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Email already exists.')
    })
  })

  describe('localLogin - Password Login', () => {
    it('should return 400 if fields are missing', async () => {
      req.body = { username: 'test' }

      await AuthController.localLogin(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('All fields are required.')
    })

    it('should return 400 if account not found', async () => {
      req.body = { username: 'nonexistent', password: 'password' }

      Account.findOne.mockResolvedValue(null)

      await AuthController.localLogin(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Invalid username or password')
    })

    it('should return 400 if password does not match', async () => {
      req.body = { username: 'testuser', password: 'wrongpassword' }

      Account.findOne.mockResolvedValue(createMockUser())
      bcrypt.compare.mockResolvedValue(false)

      await AuthController.localLogin(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Invalid username or password')
    })

    it('should return 403 if email not verified', async () => {
      req.body = { username: 'testuser', password: 'password123' }

      Account.findOne.mockResolvedValue(createMockUser({ emailVerified: false }))
      bcrypt.compare.mockResolvedValue(true)
      RefreshTokenManager.checkSuspiciousActivity.mockResolvedValue({ isSuspicious: false })

      await AuthController.localLogin(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.data.error).toContain('Email not verified')
    })

    it('should return 200 on successful login', async () => {
      req.body = { username: 'testuser', password: 'password123' }

      const mockUser = createMockUser()
      Account.findOne.mockResolvedValue(mockUser)
      bcrypt.compare.mockResolvedValue(true)
      RefreshTokenManager.checkSuspiciousActivity.mockResolvedValue({ isSuspicious: false })

      await AuthController.localLogin(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.success).toBe('User is authorized')
      expect(res.data.user.username).toBe(mockUser.username)
    })

    it('should revoke tokens on suspicious activity', async () => {
      req.body = { username: 'testuser', password: 'password123' }

      const mockUser = createMockUser()
      Account.findOne.mockResolvedValue(mockUser)
      bcrypt.compare.mockResolvedValue(true)
      RefreshTokenManager.checkSuspiciousActivity.mockResolvedValue({
        isSuspicious: true,
        recentUniqueIPs: 5,
      })

      await AuthController.localLogin(req, res)

      expect(RefreshTokenManager.revokeAllUserTokens).toHaveBeenCalledWith(
        mockUser._id,
        'suspicious_activity',
      )
    })
  })

  describe('forgotPassword', () => {
    it('should return 400 if email is missing', async () => {
      req.body = {}

      await AuthController.forgotPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Email is required')
    })

    it('should return 404 if account not found', async () => {
      req.body = { email: 'nonexistent@example.com' }

      Account.findOne.mockResolvedValue(null)

      await AuthController.forgotPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.error).toBe('No account found with that email address')
    })

    it('should send reset email on valid request', async () => {
      req.body = { email: 'test@example.com' }

      const mockUser = createMockUser()
      Account.findOne.mockResolvedValue(mockUser)

      await AuthController.forgotPassword(req, res)

      expect(Mailer.sendResetPasswordEmail).toHaveBeenCalled()
      expect(res.data.message).toContain('password reset link has been sent')
    })
  })

  describe('resetPassword', () => {
    it('should return 400 if token or password missing', async () => {
      req.body = { token: 'reset-token' }

      await AuthController.resetPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Token and password are required')
    })

    it('should return 401 for invalid/expired token', async () => {
      req.body = { token: 'invalid-token', password: 'newpassword' }

      Account.findOne.mockResolvedValue(null)

      await AuthController.resetPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.data.error).toBe('Invalid or expired password reset token')
    })
  })

  describe('resendEmailVerification', () => {
    it('should return 400 if email is missing', async () => {
      req.body = {}

      await AuthController.resendEmailVerification(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Email is required')
    })

    it('should return 404 if account not found', async () => {
      req.body = { email: 'nonexistent@example.com' }

      Account.findOne.mockResolvedValue(null)

      await AuthController.resendEmailVerification(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.error).toBe('No account found with that email address')
    })

    it('should return 400 if email already verified', async () => {
      req.body = { email: 'verified@example.com' }

      Account.findOne.mockResolvedValue(createMockUser({ emailVerified: true }))

      await AuthController.resendEmailVerification(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Email is already verified.')
    })

    it('should resend verification email', async () => {
      req.body = { email: 'unverified@example.com' }

      Account.findOne.mockResolvedValue(createMockUser({ emailVerified: false }))

      await AuthController.resendEmailVerification(req, res)

      expect(Mailer.sendVerificationEmail).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('verifyToken', () => {
    it('should return 400 if token is missing', async () => {
      req.body = {}

      await AuthController.verifyToken(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Token is required')
    })

    it('should return 401 for invalid token', async () => {
      req.body = { token: 'invalid-token' }

      Account.findOne.mockResolvedValue(null)

      await AuthController.verifyToken(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('googleOAuthCallback - Desktop OAuth', () => {
    it('should return 400 if code or codeVerifier missing', async () => {
      req.body = { code: 'auth-code' }

      await AuthController.googleOAuthCallback(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Missing required parameters')
    })
  })
})
