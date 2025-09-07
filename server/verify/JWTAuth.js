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
  // Authenticate token middleware from cookie
  const token = req.cookies.accessToken

  if (token == null) return res.sendStatus(401) // 401: not sending token

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    // Check if user has active refresh tokens (session-like check)
    const activeTokens = await RefreshTokenManager.getUserActiveTokens(user.userId)

    if (activeTokens.length === 0) {
      return res.status(403).json({ message: 'No valid session found' })
    } else {
      req.user = user
      next()
    }
  } catch (err) {
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
  // Authenticate refresh token middleware from cookie
  const token = req.cookies.refreshToken

  if (token == null) return res.sendStatus(401) // 401: not sending token

  console.log('RefreshToken: ', token)

  try {
    const user = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    // Check if refresh token exists in database and is not revoked
    const storedToken = await RefreshTokenManager.getTokenByString(token)

    if (!storedToken) {
      return res.status(403).json({ error: 'Refresh token not found or revoked' })
    } else {
      // Update token activity when used
      const currentIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
      await RefreshTokenManager.updateTokenActivity(token, currentIP)

      console.log('User from refresh token:', user)
      req.user = user
      next()
    }
  } catch (err) {
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
