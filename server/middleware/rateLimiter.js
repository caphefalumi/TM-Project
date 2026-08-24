import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { getRedisClient, isRedisReady } from '../config/redis.js'

/**
 * Creates a rate limiter with Redis store (when available).
 * The Redis store lazily checks readiness per-command, so it works even when
 * the limiter is created before Redis finishes connecting.
 */
export const createRateLimiter = (options, prefix = 'rl:') => {
  const limiterOptions = {
    ...options,
    standardHeaders: options.standardHeaders || 'draft-8',
    legacyHeaders: options.legacyHeaders !== undefined ? options.legacyHeaders : false,
    store: new RedisStore({
      sendCommand: async (...args) => {
        const client = getRedisClient()
        if (!client) {
          throw new Error('Redis client not available')
        }
        if (!isRedisReady()) {
          // Wait briefly until Redis completes connection
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if (isRedisReady()) {
                clearInterval(check)
                resolve()
              }
            }, 50)
          })
        }
        return client.sendCommand(args.flat())
      },
      prefix,
    }),
  }

  return rateLimit(limiterOptions)
}

export default createRateLimiter
