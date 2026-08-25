import express from 'express'
import {
  forgotPassword,
  googleOAuthCallback,
  localLogin,
  localRegister,
  oAuthentication,
  oAuthenticationRegister,
  resendEmailVerification,
  resetPassword,
  verifyToken,
} from './auth.controller.js'
import { renewAccessToken } from './session.controller.js'
import createRateLimiter from '../../shared/middleware/rate-limiter.middleware.js'

const router = express.Router()

const authLimiter = createRateLimiter(
  {
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  },
  'rl:auth:',
)

const registerLimiter = createRateLimiter(
  {
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: { error: 'Too many registration attempts, please try again later.' },
  },
  'rl:register:',
)

const passwordResetLimiter = createRateLimiter(
  {
    windowMs: 60 * 60 * 1000,
    limit: 3,
    message: { error: 'Too many password reset attempts, please try again later.' },
  },
  'rl:pwreset:',
)

router.post('/oauth', authLimiter, oAuthentication)
router.post('/google/register', registerLimiter, oAuthenticationRegister)
router.post('/google/callback', authLimiter, googleOAuthCallback)
router.post('/local/register', registerLimiter, localRegister)
router.post('/local/login', authLimiter, localLogin)
router.post('/forgot-password', passwordResetLimiter, forgotPassword)
router.post('/verify-reset-token', authLimiter, verifyToken)
router.post('/reset-password', passwordResetLimiter, resetPassword)
router.post('/resend-verification', authLimiter, resendEmailVerification)
router.get('/tokens/access', renewAccessToken)

export default router
