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
      sendCommand: (...args) => {
        if (!isRedisReady()) {
          // RedisStore loads Lua scripts during construction. Return a dummy SHA
          // until Redis is actually connected instead of rejecting unhandled.
          const command = String(args[0] || '').toUpperCase()
          if (command === 'SCRIPT') {
            return Promise.resolve('0'.repeat(40))
          }
          return Promise.reject(new Error('Redis not ready'))
        }
        return getRedisClient().sendCommand(args)
      },
      prefix,
    }),
  }

  return rateLimit(limiterOptions)
}

export default createRateLimiter
