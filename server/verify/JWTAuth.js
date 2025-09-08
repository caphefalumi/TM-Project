import dotenv from 'dotenv'
dotenv.config({ silent: true })
import jwt from 'jsonwebtoken'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'

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
      expiresIn: '15m', // 15 minutes
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
      expiresIn: '7d', // 7 days
    },
  )
}

export const authenticateAccessToken = async (req, res, next) => {
  // Authenticate token middleware from cookie with session validation
  const token = req.cookies.accessToken

  if (token == null) return res.sendStatus(401) // 401: not sending token
  if (sessionId == null) return res.status(401).json({ error: 'Session not found' })

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
<<<<<<< HEAD

    // Check if user has active refresh tokens (session-like check)
    const activeTokens = await RefreshTokenManager.getUserActiveTokens(user.userId)

    if (activeTokens.length === 0) {
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
=======
>>>>>>> 7c0c34ba8ed3dbe2647dd0bc34363a60235ac69f
    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid access token' })
  }
}

export const authenticateRefreshToken = async (req, res, next) => {
  // Authenticate refresh token middleware from cookie with session validation
  const token = req.cookies.refreshToken

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
    const storedToken = await RefreshTokenManager.getTokenByString(token)

    if (!storedToken) {
<<<<<<< HEAD
      // Revoke session if refresh token is invalid
      await SessionManager.revokeSession(sessionId, 'security')
      return res.status(403).json({ error: 'Refresh token not found or revoked' })
=======
      return res.status(401).json({ 
        error: 'TOKEN_REVOKED',
        message: 'Your session has been terminated. Please sign in again.'
      })
>>>>>>> 7c0c34ba8ed3dbe2647dd0bc34363a60235ac69f
    } else {
      // Update token activity when used
      const currentIP = req.clientIp
      await RefreshTokenManager.updateTokenActivity(token, currentIP)

      console.log('User from refresh token:', user)
      req.user = user
      req.sessionId = sessionId
      next()
    }
  } catch (err) {
<<<<<<< HEAD
    // Revoke session on token error
    if (sessionId) {
      await SessionManager.revokeSession(sessionId, 'security')
    }
    return res.status(403).json({ error: 'Invalid refresh token' })
=======
    return res.status(401).json({ 
      error: 'TOKEN_INVALID',
      message: 'Your session has expired. Please sign in again.'
    })
>>>>>>> 7c0c34ba8ed3dbe2647dd0bc34363a60235ac69f
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  authenticateAccessToken,
  authenticateRefreshToken,
}
