import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}))

import jwt from 'jsonwebtoken'
import { authenticateAccessToken } from '../../src/shared/middleware/auth.middleware.js'
import { mockNext, mockReq, mockRes } from '../helpers.js'

describe('authenticateAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when the access cookie is missing', () => {
    const req = mockReq({ cookies: {} })
    const res = mockRes()
    const next = mockNext()
    authenticateAccessToken(req, res, next)
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when the token is invalid', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('bad token')
    })
    const req = mockReq({ cookies: { accessToken: 'nope' } })
    const res = mockRes()
    const next = mockNext()
    authenticateAccessToken(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid access token' })
  })

  it('attaches the verified user and continues', () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: 'u1', username: 'ada' } as never)
    const req = mockReq({ cookies: { accessToken: 'good' } })
    const res = mockRes()
    const next = mockNext()
    authenticateAccessToken(req, res, next)
    expect(req.user).toEqual({ userId: 'u1', username: 'ada' })
    expect(next).toHaveBeenCalledOnce()
  })
})
