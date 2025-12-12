import express from 'express'
import AuthenticationController from '../controllers/authController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { renewAccessToken } from '../controllers/tokensController.js'

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

router.post('/oauth', oAuthentication)
router.post('/google/register', oAuthenticationRegister)

// Google OAuth PKCE endpoints
router.post('/google/callback', googleOAuthCallback)

router.post('/local/register', localRegister)
router.post('/local/login', localLogin)

router.post('/forgot-password', forgotPassword)
router.post('/verify-reset-token', verifyToken)
router.post('/reset-password', resetPassword)

router.post('/resend-verification', resendEmailVerification)

// Token refresh endpoint
router.get('/tokens/access', renewAccessToken)

export default router
