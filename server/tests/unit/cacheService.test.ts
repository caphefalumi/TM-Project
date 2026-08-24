import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cacheService } from '../../services/cacheService.ts'

describe('cacheService memory fallback', () => {
  beforeEach(async () => {
    await cacheService.clear()
  })

  it('returns null for missing keys', async () => {
    expect(await cacheService.get('missing')).toBeNull()
  })

  it('sets and gets JSON values', async () => {
    await cacheService.set('user:1', { id: 1, name: 'Ada' }, 60)
    expect(await cacheService.get('user:1')).toEqual({ id: 1, name: 'Ada' })
  })

  it('deletes a single key', async () => {
    await cacheService.set('k', { ok: true }, 60)
    expect(await cacheService.del('k')).toBe(1)
    expect(await cacheService.get('k')).toBeNull()
  })

  it('deletes keys matching a wildcard pattern', async () => {
    await cacheService.set('cache:team:1:a', { a: 1 }, 60)
    await cacheService.set('cache:team:1:b', { b: 1 }, 60)
    await cacheService.set('cache:team:2:a', { c: 1 }, 60)

    const removed = await cacheService.delPattern('cache:team:1:*')
    expect(removed).toBe(2)
    expect(await cacheService.get('cache:team:1:a')).toBeNull()
    expect(await cacheService.get('cache:team:2:a')).toEqual({ c: 1 })
  })

  it('reports existence and stats for the memory backend', async () => {
    expect(await cacheService.exists('nope')).toBe(0)
    await cacheService.set('exists', 1, 60)
    expect(await cacheService.exists('exists')).toBe(1)

    const stats = cacheService.getStats()
    expect(stats.backend).toBe('memory')
    expect(stats.redisConnected).toBeFalsy()
    expect(stats.memorySize).toBeGreaterThan(0)
  })

  it('expires keys after ttl', async () => {
    vi.useFakeTimers()
    await cacheService.set('temp', { n: 1 }, 1)
    expect(await cacheService.get('temp')).toEqual({ n: 1 })
    vi.advanceTimersByTime(1000)
    expect(await cacheService.get('temp')).toBeNull()
    vi.useRealTimers()
  })
})
