import express from 'express'
import AuthenticationController from '../controllers/authController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'

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
} = AuthenticationController

router.post('/oauth', oAuthentication)
router.post('/google/register', oAuthenticationRegister)
router.get('/user/:username', getUserIDAndEmailByName)

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
