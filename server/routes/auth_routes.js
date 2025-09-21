import express from 'express'
import Authentication from './authentication.js'
import JWTAuth from '../verify/JWTAuth.js'

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
} = Authentication
const { authenticateAccessToken } = JWTAuth

// OAuth
router.post('/oauth', oAuthentication)
router.post('/google/register', oAuthenticationRegister)
router.get('/user/:username', getUserIDAndEmailByName)

// Local Auth
router.post('/local/register', localRegister)
router.post('/local/login', localLogin)


router.get('/login-protected', authenticateAccessToken, (req, res) => {
  res.status(200).json({ success: 'Login access token is valid', user: req.user })
})

// Password Reset
router.post('/forgot-password', forgotPassword)
router.post('/verify-reset-token', verifyToken)
router.post('/reset-password', resetPassword)

export default router
