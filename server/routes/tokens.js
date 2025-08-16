import connectDB from '../config/db.js'
import RefreshToken from '../models/RefreshToken.js'
import JWTAuth from '../verify/JWTAuth.js'

const { generateAccessToken, generateRefreshToken, authenticateRefreshToken } = JWTAuth

const addRefreshToken = async (req, res, next) => {
  // Middleware to:
  // 1. Add refresh token to cookie
  // 2. Create NEW refresh token in database (revoke any existing ones for fresh login)
  await connectDB()
  const { user } = req.body
  if (!user) {
    return res.status(400).json({ error: 'User data is required' })
  }

  const refreshToken = generateRefreshToken(user)
  const accessToken = generateAccessToken(user)

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true, // Use secure cookies in production
    sameSite: 'None',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: '/',
  })
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true, // Use secure cookies in production
    sameSite: 'None',
    maxAge: 19 * 60 * 1000, // 19 minutes
    path: '/',
  })

  try {
    // For fresh login: delete any existing tokens and create new one
    await RefreshToken.deleteMany({ userId: user.userId })

    // Create new fresh token for this login session
    const newRefreshToken = new RefreshToken({
      userId: user.userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      revoked: false,
    })
    await newRefreshToken.save()

    console.log('New refresh token created for fresh login')
    res.status(200).json({ success: 'Fresh login session created successfully', accessToken })
  } catch (error) {
    console.error('Error adding refresh token:', error)
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

  // Clear both cookies immediately
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

  await connectDB()
  const { userId } = req.body
  console.log('Revoke refresh token for user:', req.body)

  if (!userId) {
    console.error('User ID is required to revoke refresh token')
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    // Mark the refresh token as revoked instead of deleting it
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

    console.log('Refresh token revoked successfully for user:', userId)
    res.status(200).json({
      success: 'Refresh token revoked successfully',
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
