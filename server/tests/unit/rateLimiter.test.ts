import { afterEach, describe, expect, it, vi } from 'vitest'

const isRedisReady = vi.fn()
const getRedisClient = vi.fn()

vi.mock('../../config/redis.js', () => ({
  isRedisReady: () => isRedisReady(),
  getRedisClient: () => getRedisClient(),
}))

import {
  createRateLimiter,
  REDIS_READY_POLL_MS,
  resolveRedisClient,
  waitForRedisReady,
} from '../../middleware/rateLimiter.js'

describe('createRateLimiter', () => {
  it('returns Express middleware', () => {
    const limiter = createRateLimiter({ windowMs: 1000, limit: 5 }, 'rl:test:')
    expect(typeof limiter).toBe('function')
    expect(limiter.length).toBeGreaterThanOrEqual(3)
  })
})

describe('waitForRedisReady', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns true immediately when Redis is already ready', async () => {
    getRedisClient.mockReturnValue({ sendCommand: vi.fn() })
    isRedisReady.mockReturnValue(true)

    await expect(waitForRedisReady(1000)).resolves.toBe(true)
  })

  it('times out instead of waiting forever when Redis never becomes ready', async () => {
    vi.useFakeTimers()
    getRedisClient.mockReturnValue({ sendCommand: vi.fn() })
    isRedisReady.mockReturnValue(false)

    const pending = waitForRedisReady(200)
    const expectation = expect(pending).resolves.toBe(false)

    await vi.advanceTimersByTimeAsync(200 + REDIS_READY_POLL_MS)
    await expectation
  })

  it('resolves true if Redis becomes ready before the timeout', async () => {
    vi.useFakeTimers()
    getRedisClient.mockReturnValue({ sendCommand: vi.fn() })
    isRedisReady.mockReturnValue(false)

    const pending = waitForRedisReady(500)
    const expectation = expect(pending).resolves.toBe(true)

    await vi.advanceTimersByTimeAsync(REDIS_READY_POLL_MS)
    isRedisReady.mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(REDIS_READY_POLL_MS)
    await expectation
  })
})

describe('resolveRedisClient', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('re-checks the client after waiting and throws if it is still missing', async () => {
    vi.useFakeTimers()
    getRedisClient.mockReturnValue(null)
    isRedisReady.mockReturnValue(false)

    const pending = resolveRedisClient(150)
    const expectation = expect(pending).rejects.toThrow('Redis not ready')

    await vi.advanceTimersByTimeAsync(150 + REDIS_READY_POLL_MS)
    await expectation
    expect(getRedisClient.mock.calls.length).toBeGreaterThan(1)
  })

  it('returns the client obtained after a successful wait', async () => {
    vi.useFakeTimers()
    const readyClient = { sendCommand: vi.fn() }
    getRedisClient.mockReturnValue(null)
    isRedisReady.mockReturnValue(false)

    const pending = resolveRedisClient(500)
    await vi.advanceTimersByTimeAsync(REDIS_READY_POLL_MS)

    getRedisClient.mockReturnValue(readyClient)
    isRedisReady.mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(REDIS_READY_POLL_MS)

    await expect(pending).resolves.toBe(readyClient)
  })
})
