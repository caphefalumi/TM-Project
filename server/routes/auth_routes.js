import express from 'express'
import Authentication from './authentication.js'
import JWTAuth from '../verify/JWTAuth.js'
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rateLimiters.js'

const router = express.Router()
const {
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
  getUserIDAndEmailByName,
  forgotPassword,
  resetPassword,
  verifyToken,
  resendEmailVerification,
  initiateTotpSetup,
  verifyTotpSetup,
  disableTotp,
} = Authentication
const { authenticateAccessToken } = JWTAuth

// OAuth
router.post('/oauth', oAuthentication)
router.post('/google/register', oAuthenticationRegister)
router.get('/user/:username', getUserIDAndEmailByName)

// Local Auth
router.post('/local/register', registerRateLimiter, localRegister)
router.post('/local/login', loginRateLimiter, localLogin)

router.get('/login-protected', authenticateAccessToken, (req, res) => {
  res.status(200).json({ success: 'Login access token is valid', user: req.user })
})

// Password Reset
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword)
router.post('/verify-reset-token', verifyToken)
router.post('/reset-password', passwordResetRateLimiter, resetPassword)

// Resend email verification
router.post('/resend-verification', resendEmailVerification)

// MFA
router.post('/mfa/totp/setup', authenticateAccessToken, initiateTotpSetup)
router.post('/mfa/totp/verify', authenticateAccessToken, verifyTotpSetup)
router.post('/mfa/totp/disable', authenticateAccessToken, disableTotp)

export default router
