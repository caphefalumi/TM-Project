import dotenv from 'dotenv'
dotenv.config({ silent: true })
import jwt from 'jsonwebtoken'
import RefreshToken from '../models/RefreshToken.js'

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
  // Authenticate token middleware from cookie
  const token = req.cookies.accessToken

  if (token == null) return res.sendStatus(401) // 401: not sending token

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    // Check refresh token for non-revoked status
    const storedToken = await RefreshToken.findOne({
      userId: user.userId,
      revoked: false,
    })

    if (!storedToken) {
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
    const storedToken = await RefreshToken.findOne({
      userId: user.userId,
      token: token,
      revoked: false,
    })

    if (!storedToken) {
      return res.status(403).json({ error: 'Refresh token not found or revoked' })
    } else if (storedToken.expiresAt < new Date()) {
      return res.status(403).json({ error: 'Refresh token has expired' })
    } else {
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
