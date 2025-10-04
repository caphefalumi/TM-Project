import express from 'express'
import AuthenticationController from '../controllers/authController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'

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
  startDesktopOAuth,
  handleDesktopOAuthCallback,
  checkDesktopOAuthStatus,
} = AuthenticationController

router.post('/oauth', oAuthentication)
router.post('/google/register', oAuthenticationRegister)

// Desktop OAuth endpoints
router.post('/oauth/start', startDesktopOAuth)
router.get('/oauth/callback', handleDesktopOAuthCallback)
router.get('/oauth/status', checkDesktopOAuthStatus)

router.post('/local/register', localRegister)
router.post('/local/login', localLogin)

router.get('/login-protected', authenticateAccessToken, (req, res) => {
  res.status(200).json({ success: 'Login access token is valid', user: req.user })
})

router.post('/forgot-password', forgotPassword)
router.post('/verify-reset-token', verifyToken)
router.post('/reset-password', resetPassword)

router.post('/resend-verification', resendEmailVerification)

export default router
