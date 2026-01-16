import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { getRedisClient, isRedisReady } from '../config/redis.js'

/**
 * Creates a rate limiter with Redis store (when available)
 * @param {object} options - Rate limiter options
 * @param {string} prefix - Redis key prefix
 */
export const createRateLimiter = (options, prefix = 'rl:') => {
  const limiterOptions = {
    ...options,
    standardHeaders: options.standardHeaders || 'draft-8',
    legacyHeaders: options.legacyHeaders !== undefined ? options.legacyHeaders : false,
  }

  // Try to use Redis store if available
  try {
    if (isRedisReady()) {
      limiterOptions.store = new RedisStore({
        sendCommand: (...args) => getRedisClient().sendCommand(args),
        prefix,
      })
    }
  } catch (error) {
    console.warn(`Rate limiter (${prefix}): Redis store unavailable, using memory store`)
  }

  return rateLimit(limiterOptions)
}

export default createRateLimiter
