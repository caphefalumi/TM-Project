import express from 'express'
import Authentication from './authentication.js'
import Tokens from './tokens.js'
import JWTAuth from '../verify/JWTAuth.js'
import { ipSecurityMiddleware } from '../verify/SecurityMiddleware.js'

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
const { addRefreshToken, revokeRefreshToken, renewAccessToken } = Tokens
const { authenticateRefreshToken, authenticateAccessToken } = JWTAuth

// OAuth
router.post('/oauth', oAuthentication)
router.post('/google/register', oAuthenticationRegister)
router.get('/user/:username', getUserIDAndEmailByName)

// Local Auth
router.post('/local/register', localRegister)
router.post('/local/login', localLogin)

// Token Handling
router.post('/tokens/refresh',  addRefreshToken)
router.delete('/tokens/refresh', revokeRefreshToken)
router.get('/tokens/access', authenticateRefreshToken, renewAccessToken)

// Protected routes
router.get('/protected', authenticateAccessToken, ipSecurityMiddleware, (req, res) => {
  res.status(200).json({ success: 'Access token is valid', user: req.user })
})

router.get('/login-protected', authenticateAccessToken, (req, res) => {
  res.status(200).json({ success: 'Login access token is valid', user: req.user })
})

// Password Reset
router.post('/forgot-password', forgotPassword)
router.post('/verify-reset-token', verifyToken)
router.post('/reset-password', resetPassword)

export default router
