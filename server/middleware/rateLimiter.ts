import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { getRedisClient, isRedisReady } from '../config/redis.ts'

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
        const command = String(args[0] || '').toUpperCase()
        let client = getRedisClient()

        if (!isRedisReady() || !client) {
          // RedisStore loads Lua scripts during construction. Return a dummy SHA
          // until Redis is actually connected instead of rejecting unhandled.
          if (command === 'SCRIPT') {
            return '0'.repeat(40)
          }

          if (!client) {
            throw new Error('Redis client not available')
          }

          await new Promise<void>((resolve) => {
            const check = setInterval(() => {
              if (isRedisReady()) {
                clearInterval(check)
                resolve()
              }
            }, 50)
          })
          client = getRedisClient()
        }

        return client.sendCommand(args.flat())
      },
      prefix,
    }),
  }

  return rateLimit(limiterOptions)
}

export default createRateLimiter
