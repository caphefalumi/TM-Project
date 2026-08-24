import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '../../middleware/rateLimiter.ts'

describe('createRateLimiter', () => {
  it('returns Express middleware', () => {
    const limiter = createRateLimiter({ windowMs: 1000, limit: 5 }, 'rl:test:')
    expect(typeof limiter).toBe('function')
    expect(limiter.length).toBeGreaterThanOrEqual(3)
  })
})
