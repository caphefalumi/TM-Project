import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import JWTAuth from '../verify/JWTAuth.js'

const { generateAccessToken, generateRefreshToken } = JWTAuth

const addRefreshToken = async (req, res) => {
  // Middleware to:
  // 1. Add refresh token to cookie
  // 2. Create NEW refresh token in database with activity tracking

  const { user } = req.body

  if (!user) {
    return res.status(400).json({ error: 'User data is required' })
  }

  const refreshToken = generateRefreshToken(user)
  const accessToken = generateAccessToken(user)

  try {
    // Set cookies
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      path: '/',
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 19 * 60 * 1000, // 19 minutes
      path: '/',
    })
    console.log(req.headers['x-forwarded-for'])
    console.log(req.socket.remoteAddress)
    console.log(req.clientIp)
    // Create new refresh token with activity tracking
    await RefreshTokenManager.createRefreshToken({
      userId: user.userId,
      token: refreshToken,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
    })


    console.log('New tokens created for user:', user.userId)
    res.status(200).json({
      success: 'Session created successfully',
      accessToken
    })
  } catch (error) {
    console.error('Error creating tokens:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const renewAccessToken = async (req, res) => {
  // Middleware to: Authenticate refresh token and renew access token
  // Note: authenticateRefreshToken middleware should be called before this function
  const accessToken = generateAccessToken(req.user)
  console.log('Renewing access token for user:', req.user)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true, // Use secure cookies in production
    sameSite: 'None',
    maxAge: 19 * 60 * 1000, // 19 minutes
    path: '/',
  })
  res.status(200).json({ accessToken })
}

const revokeRefreshToken = async (req, res) => {
  // Mark refresh token as revoked in database and clear cookies
  // This is called when user logout or when refresh token needs to be invalidated

  const { userId } = req.body

  // Clear all cookies immediately
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
    // Revoke all user's refresh tokens
    const result = await RefreshTokenManager.revokeAllUserTokens(userId, 'user_logout')

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

export default {
  addRefreshToken,
  renewAccessToken,
  revokeRefreshToken,
}
