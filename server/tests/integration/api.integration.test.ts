import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/gridfsService.ts', () => ({
  initGridFS: vi.fn(),
  createMulterGridFSStorage: () => ({
    _handleFile: (_req: unknown, file: { originalname: string }, cb: (error: Error | null, info?: object) => void) =>
      cb(null, { filename: file.originalname }),
    _removeFile: (_req: unknown, _file: unknown, cb: (error: Error | null) => void) => cb(null),
  }),
  uploadImageToGridFS: vi.fn(),
  getImageFromGridFS: vi.fn(),
  getImageMetadata: vi.fn(),
  processBase64Image: vi.fn(),
}))

vi.mock('../../config/db.ts', () => ({
  default: vi.fn(),
}))

vi.mock('../../config/redis.ts', () => ({
  initRedis: vi.fn(async () => null),
  isRedisReady: vi.fn(() => false),
  getRedisClient: vi.fn(),
  closeRedis: vi.fn(),
}))

vi.mock('../../middleware/rateLimiter.ts', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  createRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import request from 'supertest'
import app from '../../app.ts'

describe('API app integration', () => {
  it('issues a CSRF token from the real app', async () => {
    const response = await request(app).get('/api/csrf-token')
    expect(response.status).toBe(200)
    expect(response.body.csrfToken).toEqual(expect.any(String))
  })

  it('rejects protected mutations without CSRF', async () => {
    const response = await request(app).post('/api/teams').send({ title: 'Team' })
    expect(response.status).toBe(403)
    expect(response.body.error).toMatch(/CSRF/)
  })

  it('returns 401 for authenticated GET routes without an access token', async () => {
    const response = await request(app).get('/api/users')
    expect([401, 403]).toContain(response.status)
  })
})
