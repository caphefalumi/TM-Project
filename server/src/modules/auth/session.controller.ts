import crypto from 'crypto'
import dotenv from 'dotenv'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import RefreshTokenManager from './session.service.js'
import {
  generateAccessToken,
  generateRefreshToken,
  type TokenUser,
} from './token.service.js'

dotenv.config({ quiet: true })

export const addRefreshToken = async (req: Request, res: Response) => {
  const { user } = req.body

  if (!user) {
    return res.status(400).json({ error: 'User data is required' })
  }

  try {
    const sessionId = crypto.randomBytes(16).toString('hex')
    const refreshToken = generateRefreshToken(user)
    const accessToken = generateAccessToken(user)

    await RefreshTokenManager.createRefreshToken({
      userId: user.userId,
      token: refreshToken,
      sessionId,
      ipAddress: req.clientIp,
      userAgent: req.get('User-Agent'),
      expiresAt: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TIME)),
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      maxAge: Number(process.env.REFRESH_TOKEN_TIME),
      path: '/',
    })
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      maxAge: Number(process.env.ACCESS_TOKEN_TIME),
      path: '/',
    })

    console.log('New tokens created for user:', user.userId)
    return res.status(200).json({
      success: 'Session created successfully',
      accessToken,
    })
  } catch (error) {
    console.log('Error creating tokens:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const renewAccessToken = async (req: Request, res: Response) => {
  if (await RefreshTokenManager.isUnauthorizedAccess(req.cookies.refreshToken)) {
    console.log('Unauthorized access detected for token:', req.cookies.refreshToken)
    return res.status(403).json({ error: 'Unauthorized access' })
  }

  try {
    const currentRefreshToken = req.cookies.refreshToken
    if (!currentRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' })
    }

    const currentTokenData =
      await RefreshTokenManager.getTokenByString(currentRefreshToken)
    if (!currentTokenData) {
      console.log('Revoked token used:', currentRefreshToken)
      res.clearCookie('accessToken', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      })
      res.clearCookie('refreshToken', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      })
      return res.status(403).json({
        error: 'TOKEN_REVOKED',
        message: 'Your session has been terminated. Please sign in again.',
      })
    }

    const user = jwt.verify(
      currentRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as TokenUser
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    await RefreshTokenManager.createRefreshToken({
      userId: user.userId,
      token: refreshToken,
      sessionId: currentTokenData.sessionId,
      ipAddress: req.clientIp,
      userAgent: req.get('User-Agent'),
      expiresAt: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TIME)),
    })

    console.log('Renewing access token for user:', user)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      maxAge: Number(process.env.ACCESS_TOKEN_TIME),
      path: '/',
    })
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      maxAge: Number(process.env.REFRESH_TOKEN_TIME),
    })
    await RefreshTokenManager.revokeTokenByString(
      currentRefreshToken,
      'refresh_session',
    )

    return res.status(200).json({ accessToken })
  } catch (error) {
    console.log('Error renewing access token:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const revokeRefreshToken = async (req: Request, res: Response) => {
  const { userId } = req.body
  const refreshToken = req.cookies.refreshToken

  if (!refreshToken) {
    return res.status(400).json({ error: 'No refresh token provided' })
  }

  res.clearCookie('refreshToken', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
  })
  res.clearCookie('accessToken', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
  })

  console.log('Revoking refresh tokens for user:', userId)
  if (!userId) {
    console.log('User ID is required to revoke refresh token')
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    await RefreshTokenManager.revokeTokenByString(refreshToken, 'user_logout')
    console.log('Refresh tokens revoked successfully for user:', userId)
    return res.status(200).json({
      success: 'Session terminated successfully',
      message: 'User logged out successfully',
    })
  } catch (error) {
    console.log('Error revoking refresh token:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const getActiveTokens = async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId
    const refreshToken = req.cookies.refreshToken
    const stats = await RefreshTokenManager.getUserTokenStats(userId, refreshToken)

    return res.status(200).json({
      success: true,
      totalCount: stats.activeTokenCount,
      sessionCount: stats.activeSessionCount,
      uniqueIPs: stats.uniqueIPs,
      totalActivity: stats.totalActivity,
      lastActivity: stats.lastActivity,
      sessions: stats.sessions,
      tokens: stats.tokens,
    })
  } catch (error) {
    console.log('Error fetching active tokens:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const getSecurityStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId
    const suspiciousActivity =
      await RefreshTokenManager.checkSuspiciousActivity(userId)
    const stats = await RefreshTokenManager.getUserTokenStats(userId)

    return res.status(200).json({
      success: true,
      isSuspicious: suspiciousActivity.isSuspicious,
      uniqueIPs: stats.uniqueIPs,
      activeTokenCount: stats.activeTokenCount,
      recentUniqueIPs: suspiciousActivity.recentUniqueIPs,
      details: suspiciousActivity,
    })
  } catch (error) {
    console.log('Error checking security:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteTokenById = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const userId = req.user.userId
    const token = await RefreshTokenManager.getTokenByString(
      req.cookies.refreshToken,
    )

    if (!token || token.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const result = await RefreshTokenManager.revokeToken(tokenId, 'user_revoke')
    if (!result) {
      return res.status(404).json({ error: 'Token not found' })
    }

    return res.status(200).json({
      success: true,
      message: 'Session ended successfully',
    })
  } catch (error) {
    console.log('Error revoking token:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteOtherTokens = async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId
    const currentToken = req.cookies.refreshToken

    if (!currentToken) {
      return res.status(401).json({ error: 'No current token found' })
    }

    const result = await RefreshTokenManager.revokeAllUserTokensExcept(
      userId,
      currentToken,
      'security',
    )

    return res.status(200).json({
      success: true,
      message: `Ended ${result.modifiedCount} other sessions`,
      count: result.modifiedCount,
    })
  } catch (error) {
    console.log('Error revoking other tokens:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default {
  addRefreshToken,
  renewAccessToken,
  revokeRefreshToken,
  getActiveTokens,
  getSecurityStatus,
  deleteTokenById,
  deleteOtherTokens,
}
