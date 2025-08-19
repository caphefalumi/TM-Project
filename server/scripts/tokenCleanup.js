import RefreshToken from '../models/RefreshToken.js'

/**
 * Clean up expired and old revoked refresh tokens from the database
 * This should be run periodically to keep the database clean
 */
const cleanupExpiredTokens = async () => {
  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

    // Delete tokens that are either:
    // 1. Expired (past their expiresAt date)
    // 2. Revoked more than a week ago (for audit trail)
    const result = await RefreshToken.deleteMany({
      $or: [
        { expiresAt: { $lt: now } }, // Expired tokens
        {
          revoked: true,
          revokedAt: { $lt: oneWeekAgo },
        }, // Revoked tokens older than a week
      ],
    })

    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired/old refresh tokens`)
    }

    return result.deletedCount
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error)
    throw error
  }
}

/**
 * Initialize periodic cleanup of expired tokens
 * Runs every 6 hours
 */
const initTokenCleanup = () => {
  // Run cleanup immediately on startup
  cleanupExpiredTokens()

  // Set up periodic cleanup every 6 hours
  setInterval(
    () => {
      cleanupExpiredTokens()
    },
    6 * 60 * 60 * 1000,
  ) // 6 hours in milliseconds

  console.log('Token cleanup job initialized - running every 6 hours')
}

export { cleanupExpiredTokens, initTokenCleanup }
