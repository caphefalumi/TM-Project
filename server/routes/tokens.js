import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import JWTAuth from '../verify/JWTAuth.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
const { generateAccessToken, generateRefreshToken } = JWTAuth

const addRefreshToken = async (req, res) => {
  const { user } = req.body

  if (!user) {
    return res.status(400).json({ error: 'User data is required' })
  }

  try {
    // Generate a unique sessionId for this login session
    const sessionId = crypto.randomBytes(16).toString('hex')

    // Always create new tokens for new login
    const refreshToken = generateRefreshToken(user)
    const accessToken = generateAccessToken(user)

    await RefreshTokenManager.createRefreshToken({
      userId: user.userId,
      token: refreshToken,
      sessionId: sessionId,
      ipAddress: req.clientIp,
      userAgent: req.get('User-Agent'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })

    // Set cookies
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 20 * 60 * 1000, // 20 minutes
      path: '/',
    })

    console.log('New tokens created for user:', user.userId)
    res.status(200).json({
      success: 'Session created successfully',
      accessToken,
    })
  } catch (error) {
    console.error('Error creating tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const renewAccessToken = async (req, res) => {
  if (await RefreshTokenManager.isUnauthorizedAccess(req.cookies.refreshToken)) {
    console.log('Unauthorized access detected for token:', req.cookies.refreshToken)
    return res.status(403).json({ error: 'Unauthorized access' })
  }

  try {
    // Get the current refresh token to preserve sessionId
    const currentRefreshToken = req.cookies.refreshToken
    if (!currentRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' })
    }
    const currentTokenData = await RefreshTokenManager.getTokenByString(currentRefreshToken)

    if (!currentTokenData) {
      console.log('Revoked token used:', currentRefreshToken)
      res.clearCookie('accessToken', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      })
      res.clearCookie('refreshToken', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      })
      return res.status(403).json({
        error: 'TOKEN_REVOKED',
        message: 'Your session has been terminated. Please sign in again.',
      })
    }
    const user = jwt.verify(currentRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    await RefreshTokenManager.createRefreshToken({
      userId: user.userId,
      token: refreshToken,
      sessionId: currentTokenData.sessionId, // Preserve sessionId
      ipAddress: req.clientIp,
      userAgent: req.get('User-Agent'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })

    console.log('Renewing access token for user:', user)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 20 * 60 * 1000, // 20 minutes
      path: '/',
    })
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    await RefreshTokenManager.revokeTokenByString(currentRefreshToken, 'refresh_session')

    res.status(200).json({ accessToken })
  } catch (error) {
    console.error('Error renewing access token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const revokeRefreshToken = async (req, res) => {
  const { userId } = req.body
  const refreshToken = req.cookies.refreshToken

  if (!refreshToken) {
    return res.status(400).json({ error: 'No refresh token provided' })
  }
  res.clearCookie('refreshToken', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  })
  res.clearCookie('accessToken', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  })

  console.log('Revoking refresh tokens for user:', userId)

  if (!userId) {
    console.error('User ID is required to revoke refresh token')
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    await RefreshTokenManager.revokeTokenByString(refreshToken, 'user_logout')

    console.log('Refresh tokens revoked successfully for user:', userId)
    res.status(200).json({
      success: 'Session terminated successfully',
      message: 'User logged out successfully',
    })
  } catch (error) {
    console.error('Error revoking refresh token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export { addRefreshToken, renewAccessToken, revokeRefreshToken }
