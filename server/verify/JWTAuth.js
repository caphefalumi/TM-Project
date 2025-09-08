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
    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid access token' })
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
      return res.status(401).json({ 
        error: 'TOKEN_REVOKED',
        message: 'Your session has been terminated. Please sign in again.'
      })
    } else {
      // Update token activity when used
      const currentIP = req.clientIp
      await RefreshTokenManager.updateTokenActivity(token, currentIP)

      console.log('User from refresh token:', user)
      req.user = user
      next()
    }
  } catch (err) {
    return res.status(401).json({ 
      error: 'TOKEN_INVALID',
      message: 'Your session has expired. Please sign in again.'
    })
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  authenticateAccessToken,
  authenticateRefreshToken,
}
