import dotenv from 'dotenv'
dotenv.config({ quiet: true })
import jwt from 'jsonwebtoken'

export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_TOKEN_TIME, // 15 minutes
    },
  )
}

export function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_TOKEN_TIME, // 7 days
    },
  )
}

export default {
  generateAccessToken,
  generateRefreshToken,
}
