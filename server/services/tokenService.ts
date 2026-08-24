import dotenv from 'dotenv'
dotenv.config({ quiet: true })
import jwt from 'jsonwebtoken'

export type TokenUser = {
  userId: string
  username: string
  email?: string
}

export function generateAccessToken(user: TokenUser) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.JWT_ACCESS_TOKEN_TIME as jwt.SignOptions['expiresIn'],
    },
  )
}

export function generateRefreshToken(user: TokenUser) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.JWT_REFRESH_TOKEN_TIME as jwt.SignOptions['expiresIn'],
    },
  )
}

export default {
  generateAccessToken,
  generateRefreshToken,
}
