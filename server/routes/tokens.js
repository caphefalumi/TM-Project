import RefreshToken from '../models/RefreshToken.js'
import SessionManager from '../scripts/sessionManager.js'
import JWTAuth from '../verify/JWTAuth.js'

const { generateAccessToken, generateRefreshToken } = JWTAuth

const addRefreshToken = async (req, res, next) => {
  // Middleware to:
  // 1. Add refresh token to cookie
  // 2. Create NEW refresh token in database (revoke any existing ones for fresh login)
  // 3. Create session with session ID

  const { user } = req.body
  if (!user) {
    return res.status(400).json({ error: 'User data is required' })
  }

  const refreshToken = generateRefreshToken(user)
  const accessToken = generateAccessToken(user)

  try {
    // Create session and get session ID
    const session = await SessionManager.createSession(user.userId, refreshToken, req)

    // Set cookies with session ID
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

    // Set session ID cookie
    res.cookie('sessionId', session.sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      path: '/',
    })

    // Clean up old refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user.userId })

    // Create new refresh token record
    const newRefreshToken = new RefreshToken({
      userId: user.userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      revoked: false,
    })
    await newRefreshToken.save()

    console.log('New session and tokens created for user:', user.userId)
    res.status(200).json({
      success: 'Session created successfully',
      accessToken,
      sessionId: session.sessionId
    })
  } catch (error) {
    console.error('Error creating session and tokens:', error)
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
  // Mark refresh token as revoked in database, clear cookies, and revoke session
  // This is called when user logout or when refresh token needs to be invalidated

  const sessionId = req.cookies.sessionId
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
  res.clearCookie('sessionId', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  })

  console.log('Revoking session and refresh token for user:', userId)

  if (!userId) {
    console.error('User ID is required to revoke refresh token')
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    // Revoke session if session ID is provided
    if (sessionId) {
      await SessionManager.revokeSession(sessionId, 'logout')
    }

    // Mark the refresh token as revoked
    const result = await RefreshToken.updateOne(
      { userId },
      {
        revoked: true,
        revokedAt: new Date(),
      },
    )

    if (result.matchedCount === 0) {
      console.log('Refresh token not found for user:', userId)
      return res.status(404).json({ message: 'Refresh token not found' })
    }

    console.log('Session and refresh token revoked successfully for user:', userId)
    res.status(200).json({
      success: 'Session terminated successfully',
      message: 'User logged out successfully',
    })
  } catch (error) {
    console.error('Error revoking session and refresh token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default {
  addRefreshToken,
  renewAccessToken,
  revokeRefreshToken,
}
