import { describe, it, expect, vi } from 'vitest'
import Tokens from 'csrf'
import { csrfProtection, getCsrfToken } from '../../src/shared/middleware/csrf.middleware.js'
import { mockNext, mockReq, mockRes } from '../helpers.js'

describe('csrfProtection', () => {
  it('skips safe methods', () => {
    const req = mockReq({ method: 'GET' })
    const res = mockRes()
    const next = mockNext()
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('skips excluded auth paths', () => {
    const req = mockReq({
      method: 'POST',
      originalUrl: '/api/auth/local/login',
    })
    const res = mockRes()
    const next = mockNext()
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects requests without a CSRF cookie or header', () => {
    const req = mockReq({ method: 'POST', originalUrl: '/api/teams' })
    const res = mockRes()
    const next = mockNext()
    csrfProtection(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'CSRF token missing' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects invalid CSRF tokens', () => {
    const req = mockReq({
      method: 'POST',
      originalUrl: '/api/teams',
      cookies: { 'csrf-secret': 'secret' },
      headers: { 'x-csrf-token': 'not-a-token' },
    })
    const res = mockRes()
    const next = mockNext()
    csrfProtection(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid CSRF token' })
  })

  it('accepts a valid double-submit token', () => {
    const tokens = new Tokens()
    const secret = tokens.secretSync()
    const token = tokens.create(secret)
    const req = mockReq({
      method: 'POST',
      originalUrl: '/api/teams',
      cookies: { 'csrf-secret': secret },
      headers: { 'x-csrf-token': token },
    })
    const res = mockRes()
    const next = mockNext()
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('getCsrfToken', () => {
  it('creates a secret cookie and returns a token', () => {
    const req = mockReq({ cookies: {} })
    const res = mockRes()
    getCsrfToken(req, res)
    expect(res.cookie).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ csrfToken: expect.any(String) }),
    )
  })

  it('reuses an existing secret cookie', () => {
    const tokens = new Tokens()
    const secret = tokens.secretSync()
    const req = mockReq({ cookies: { 'csrf-secret': secret } })
    const res = mockRes()
    getCsrfToken(req, res)
    expect(res.cookie).not.toHaveBeenCalled()
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(tokens.verify(secret, payload.csrfToken)).toBe(true)
  })
})
