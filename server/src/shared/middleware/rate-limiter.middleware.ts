import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { getRedisClient, isRedisReady } from '../config/redis.config.js'

export const REDIS_READY_POLL_MS = 50
export const REDIS_READY_TIMEOUT_MS = Number(process.env.REDIS_READY_TIMEOUT_MS || 2000)

const isUsableRedisClient = (client: ReturnType<typeof getRedisClient>) => {
  return Boolean(client && isRedisReady())
}

export const waitForRedisReady = async (timeoutMs = REDIS_READY_TIMEOUT_MS) => {
  if (isUsableRedisClient(getRedisClient())) {
    return true
  }

  const startedAt = Date.now()

  return new Promise<boolean>((resolve) => {
    const finish = (ready: boolean) => {
      clearInterval(timer)
      resolve(ready)
    }

    const timer = setInterval(() => {
      if (isUsableRedisClient(getRedisClient())) {
        finish(true)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        finish(false)
      }
    }, REDIS_READY_POLL_MS)
  })
}

export const resolveRedisClient = async (timeoutMs = REDIS_READY_TIMEOUT_MS) => {
  let client = getRedisClient()
  if (isUsableRedisClient(client)) {
    return client
  }

  const becameReady = await waitForRedisReady(timeoutMs)
  client = getRedisClient()

  if (!becameReady || !isUsableRedisClient(client) || !client) {
    throw new Error('Redis not ready')
  }

  return client
}

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

        // RedisStore loads Lua scripts during construction. Return a dummy SHA
        // until Redis is actually connected instead of rejecting unhandled.
        if (command === 'SCRIPT' && !isUsableRedisClient(getRedisClient())) {
          return '0'.repeat(40)
        }

        const client = await resolveRedisClient()
        return client.sendCommand(args.flat())
      },
      prefix,
    }),
  }

  return rateLimit(limiterOptions)
}

export default createRateLimiter
