import dotenv from 'dotenv'
dotenv.config({ silent: true })
import jwt from 'jsonwebtoken'
import RefreshToken from '../models/RefreshToken.js'
import SessionManager from '../scripts/sessionManager.js'

function generateAccessToken(user) {
  console.log('Generating access token for user:', user)
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '19m', // 19 minutes
    },
  )
}

const generateRefreshToken = (user) => {
  console.log('Generating refresh token for user:', user.username)
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '12h', // 12 hours
    },
  )
}

export const authenticateAccessToken = async (req, res, next) => {
  // Authenticate token middleware from cookie with session validation
  const token = req.cookies.accessToken
  const sessionId = req.cookies.sessionId
  
  if (token == null) return res.sendStatus(401) // 401: not sending token
  if (sessionId == null) return res.status(401).json({ error: 'Session not found' })

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    // Validate session
    const session = await SessionManager.validateSession(sessionId, user.userId)
    if (!session) {
      return res.status(403).json({ error: 'Invalid or expired session' })
    }

    // Check refresh token for non-revoked status
    const storedToken = await RefreshToken.findOne({
      userId: user.userId,
      revoked: false,
    })

    if (!storedToken) {
      // Revoke session if refresh token is invalid
      await SessionManager.revokeSession(sessionId, 'security')
      return res.status(403).json({ message: 'No valid session found' })
    } else {
      // Update session activity
      await SessionManager.updateSessionActivity(sessionId)
      req.user = user
      req.sessionId = sessionId
      next()
    }
  } catch (err) {
    // Revoke session on token error
    if (sessionId) {
      await SessionManager.revokeSession(sessionId, 'security')
    }
    return res.status(403).json({ message: 'Invalid access token' })
  }
}

export const authenticateAccessTokenOnly = async (req, res, next) => {
  // Authenticate ONLY access token without checking refresh token status
  // Used during fresh login process before refresh token is properly set
  const token = req.cookies.accessToken
  if (token == null) return res.sendStatus(401) // 401: not sending token

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid access token' })
  }
}

export const authenticateRefreshToken = async (req, res, next) => {
  // Authenticate refresh token middleware from cookie with session validation
  const token = req.cookies.refreshToken
  const sessionId = req.cookies.sessionId
  
  if (token == null) return res.sendStatus(401) // 401: not sending token
  if (sessionId == null) return res.status(401).json({ error: 'Session not found' })

  console.log('RefreshToken: ', token)

  try {
    const user = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    // Validate session
    const session = await SessionManager.validateSession(sessionId, user.userId)
    if (!session) {
      return res.status(403).json({ error: 'Invalid or expired session' })
    }

    // Check if refresh token exists in database and is not revoked
    const storedToken = await RefreshToken.findOne({
      userId: user.userId,
      token: token,
      revoked: false,
    })
    
    if (!storedToken) {
      // Revoke session if refresh token is invalid
      await SessionManager.revokeSession(sessionId, 'security')
      return res.status(403).json({ error: 'Refresh token not found or revoked' })
    } else if (storedToken.expiresAt < new Date()) {
      // Revoke session if refresh token is expired
      await SessionManager.revokeSession(sessionId, 'timeout')
      return res.status(403).json({ error: 'Refresh token has expired' })
    } else {
      console.log('User from refresh token:', user)
      req.user = user
      req.sessionId = sessionId
      next()
    }
  } catch (err) {
    // Revoke session on token error
    if (sessionId) {
      await SessionManager.revokeSession(sessionId, 'security')
    }
    return res.status(403).json({ error: 'Invalid refresh token' })
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  authenticateAccessToken,
  authenticateAccessTokenOnly,
  authenticateRefreshToken,
}
