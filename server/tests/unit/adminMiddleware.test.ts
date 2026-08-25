import { describe, it, expect } from 'vitest'
import { checkAdminAccess } from '../../src/modules/admin/admin.middleware.js'
import { mockNext, mockReq, mockRes } from '../helpers.js'

describe('checkAdminAccess', () => {
  it('allows the global admin username', () => {
    const req = mockReq({ user: { userId: '1', username: 'admin' } })
    const res = mockRes()
    const next = mockNext()
    checkAdminAccess(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects non-admin users', () => {
    const req = mockReq({ user: { userId: '2', username: 'ada' } })
    const res = mockRes()
    const next = mockNext()
    checkAdminAccess(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
