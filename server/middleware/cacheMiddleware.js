import { cacheService } from '../services/cacheService.js'

/**
 * Cache middleware factory for caching GET responses
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {function} keyGenerator - Optional custom key generator function
 */
export const cacheResponse = (ttlSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `cache:${req.originalUrl}:${req.user?.userId || 'anon'}`

      // Try to get cached response
      const cachedData = await cacheService.get(cacheKey)

      if (cachedData) {
        // Cache hit - return cached response
        return res.status(cachedData.status || 200).json(cachedData.body)
      }

      // Cache miss - intercept res.json to cache the response
      const originalJson = res.json.bind(res)

      res.json = function (body) {
        // Only cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const dataToCache = {
            status: res.statusCode,
            body: body,
            cachedAt: new Date().toISOString(),
          }

          // Cache asynchronously (don't wait for it)
          cacheService.set(cacheKey, dataToCache, ttlSeconds).catch((err) => {
            console.error('Error caching response:', err.message)
          })
        }

        // Call original json method
        return originalJson(body)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error.message)
      // Continue without caching on error
      next()
    }
  }
}

/**
 * Middleware to invalidate cache patterns after mutations
 * @param  {...string} patterns - Cache key patterns to invalidate (supports wildcards)
 */
export const invalidateCache = (...patterns) => {
  return async (req, res, next) => {
    // Store patterns to invalidate after response
    res.on('finish', async () => {
      // Only invalidate on successful mutations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            // Replace placeholders in pattern
            let processedPattern = pattern
              .replace(':userId', req.user?.userId || '*')
              .replace(':teamId', req.params.teamId || req.body?.teamId || '*')

            await cacheService.delPattern(processedPattern)
          }
        } catch (error) {
          console.error('Error invalidating cache:', error.message)
        }
      }
    })

    next()
  }
}

/**
 * Generate cache key for team-specific endpoints
 */
export const teamCacheKey = (req) => {
  const teamId = req.params.teamId || req.query.teamId
  const userId = req.user?.userId || 'anon'
  return `cache:team:${teamId}:${userId}:${req.path}`
}

/**
 * Generate cache key for user-specific endpoints
 */
export const userCacheKey = (req) => {
  const userId = req.user?.userId || 'anon'
  return `cache:user:${userId}:${req.path}`
}

/**
 * Admin-only endpoint to view cache statistics
 */
export const getCacheStats = async (req, res) => {
  try {
    const stats = cacheService.getStats()
    return res.status(200).json(stats)
  } catch (error) {
    console.error('Error getting cache stats:', error.message)
    return res.status(500).json({ error: 'Failed to get cache stats' })
  }
}

/**
 * Admin-only endpoint to clear entire cache
 */
export const clearCache = async (req, res) => {
  try {
    await cacheService.clear()
    return res.status(200).json({ message: 'Cache cleared successfully' })
  } catch (error) {
    console.error('Error clearing cache:', error.message)
    return res.status(500).json({ error: 'Failed to clear cache' })
  }
}

export default {
  cacheResponse,
  invalidateCache,
  teamCacheKey,
  userCacheKey,
  getCacheStats,
  clearCache,
}
