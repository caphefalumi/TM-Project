import RefreshTokenManager from '../../modules/auth/session.service.js'

/**
 * Clean up expired refresh tokens from the database.
 */
const cleanupExpiredTokens = async () => {
  try {
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
 * Initialize cleanup immediately and repeat it every six hours.
 */
const initTokenCleanup = () => {
  cleanupExpiredTokens()

  setInterval(
    () => {
      cleanupExpiredTokens()
    },
    6 * 60 * 60 * 1000,
  )

  console.log('Token cleanup job initialized - running every 6 hours')
}

export { cleanupExpiredTokens, initTokenCleanup }
