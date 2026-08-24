import RefreshTokenManager from './refreshTokenManager.js'

/**
 * Clean up expired and old revoked refresh tokens from the database
 * This should be run periodically to keep the database clean
 */
const cleanupExpiredTokens = async () => {
  try {
    // Use RefreshTokenManager's cleanup method
    const result = await RefreshTokenManager.cleanupExpiredTokens()

    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired refresh tokens`)
    }

    return result.deletedCount
  } catch (error) {
    console.log('Error cleaning up expired tokens:', error)
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
