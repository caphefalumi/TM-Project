import express from 'express'
import AuthenticationController from '../controllers/authController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { renewAccessToken } from '../controllers/tokensController.js'
import createRateLimiter from '../middleware/rateLimiter.js'

const router = express.Router()
const {
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
  forgotPassword,
  resetPassword,
  verifyToken,
  resendEmailVerification,
  googleOAuthCallback,
  // handleDesktopOAuthCallback, - DEPRECATED
  // checkDesktopOAuthStatus, - DEPRECATED
} = AuthenticationController

// Strict rate limiter for auth endpoints (prevent brute force attacks)
const authLimiter = createRateLimiter(
  {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Limit each IP to 10 login attempts per 15 minutes
    skipSuccessfulRequests: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  },
  'rl:auth:',
)

// More lenient rate limiter for registration
const registerLimiter = createRateLimiter(
  {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5, // Limit each IP to 5 registrations per hour
    message: { error: 'Too many registration attempts, please try again later.' },
  },
  'rl:register:',
)

// Rate limiter for password reset
const passwordResetLimiter = createRateLimiter(
  {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3, // Limit each IP to 3 password reset requests per hour
    message: { error: 'Too many password reset attempts, please try again later.' },
  },
  'rl:pwreset:',
)

router.post('/oauth', authLimiter, oAuthentication)
router.post('/google/register', registerLimiter, oAuthenticationRegister)

// Google OAuth PKCE endpoints
router.post('/google/callback', authLimiter, googleOAuthCallback)

router.post('/local/register', registerLimiter, localRegister)
router.post('/local/login', authLimiter, localLogin)

router.post('/forgot-password', passwordResetLimiter, forgotPassword)
router.post('/verify-reset-token', authLimiter, verifyToken)
router.post('/reset-password', passwordResetLimiter, resetPassword)

router.post('/resend-verification', authLimiter, resendEmailVerification)

// Token refresh endpoint
router.get('/tokens/access', renewAccessToken)

export default router
