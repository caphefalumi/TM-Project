import dotenv from 'dotenv'
dotenv.config({ path: './src/server/.env' })
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
      expiresIn: '10m', // 10 minutes
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

const authenticateAccessToken = (req, res, next) => {
  // Authenticate token middleware from cookie
  const token = req.cookies.accessToken
  if (token == null) return res.sendStatus(401) // 401: not sending token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403).json({ error: 'Invalid token' })
    const storedToken = RefreshToken.findOne({ userId: user.userId })
    if (!storedToken) {
      return res.status(403).json({ error: 'Refresh token not found' })
    } else if (storedToken.revoked) {
      return res.status(403).json({ error: 'Refresh token has been revoked' })
    } else {
      req.user = user
      next()
    }
  })
}

const authenticateRefreshToken = (req, res, next) => {
  // Authenticate refresh token middleware from cookie
  const token = req.cookies.refreshToken
  if (token == null) return res.sendStatus(401) // 401: not sending token
  console.log('RefreshToken: ', token)
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403).json({ error: 'Invalid refresh token' })
      console.log('User from refresh token:', user)
      req.user = user
      next()
  })
}

export default {
  generateAccessToken,
  generateRefreshToken,
  authenticateAccessToken,
  authenticateRefreshToken,
}
