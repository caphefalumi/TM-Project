import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cacheResponse,
  invalidateCache,
  teamCacheKey,
  userCacheKey,
} from '../../src/shared/middleware/cache.middleware.js'
import { cacheService } from '../../src/shared/services/cache.service.js'
import { mockNext, mockReq, mockRes } from '../helpers.js'

describe('cache key helpers', () => {
  it('builds team-scoped cache keys', () => {
    const req = mockReq({
      params: { teamId: 't1' },
      path: '/t1/announcements',
      user: { userId: 'u1', username: 'ada' },
    })
    expect(teamCacheKey(req)).toBe('cache:team:t1:u1:/t1/announcements')
  })

  it('builds user-scoped cache keys', () => {
    const req = mockReq({
      path: '/teams',
      user: { userId: 'u9', username: 'ada' },
    })
    expect(userCacheKey(req)).toBe('cache:user:u9:/teams')
  })
})

describe('cacheResponse', () => {
  beforeEach(async () => {
    await cacheService.clear()
  })

  it('skips non-GET requests', async () => {
    const req = mockReq({ method: 'POST' })
    const res = mockRes()
    const next = mockNext()
    await cacheResponse(60)(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('returns a cached payload on cache hit', async () => {
    await cacheService.set('cache:/teams:u1', { status: 200, body: { teams: [1] } }, 60)
    const req = mockReq({
      method: 'GET',
      originalUrl: '/teams',
      user: { userId: 'u1', username: 'ada' },
    })
    const res = mockRes()
    const next = mockNext()
    await cacheResponse(60)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ teams: [1] })
    expect(next).not.toHaveBeenCalled()
  })

  it('stores successful JSON responses on cache miss', async () => {
    const req = mockReq({
      method: 'GET',
      originalUrl: '/teams',
      user: { userId: 'u1', username: 'ada' },
    })
    const res = mockRes()
    const next = mockNext()
    await cacheResponse(60)(req, res, next)
    expect(next).toHaveBeenCalledOnce()

    res.json({ teams: ['new'] })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(await cacheService.get('cache:/teams:u1')).toMatchObject({
      status: 200,
      body: { teams: ['new'] },
    })
  })
})

describe('invalidateCache', () => {
  beforeEach(async () => {
    await cacheService.clear()
  })

  it('replaces :teamId placeholders and deletes matching keys after success', async () => {
    await cacheService.set('cache:team:t1:u1:/announcements', { ok: true }, 60)
    await cacheService.set('cache:team:t2:u1:/announcements', { ok: true }, 60)

    const handlers: Record<string, () => Promise<void>> = {}
    const req = mockReq({
      method: 'POST',
      params: { teamId: 't1' },
      user: { userId: 'u1', username: 'ada' },
    })
    const res = mockRes()
    res.statusCode = 201
    res.on = vi.fn((event: string, handler: () => Promise<void>) => {
      handlers[event] = handler
    }) as typeof res.on

    const next = mockNext()
    await invalidateCache('cache:team::teamId:*')(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    await handlers.finish()

    expect(await cacheService.get('cache:team:t1:u1:/announcements')).toBeNull()
    expect(await cacheService.get('cache:team:t2:u1:/announcements')).toEqual({ ok: true })
  })
})
