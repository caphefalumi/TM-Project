import { vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

export function mockReq(overrides: Partial<Request> & Record<string, unknown> = {}) {
  return {
    method: 'GET',
    originalUrl: '/',
    path: '/',
    cookies: {},
    headers: {},
    body: {},
    params: {},
    query: {},
    user: undefined,
    get: vi.fn(),
    ...overrides,
  } as unknown as Request
}

export function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    json: vi.fn(function json(this: typeof res, body: unknown) {
      this.body = body
      return this
    }),
    status: vi.fn(function status(this: typeof res, code: number) {
      this.statusCode = code
      return this
    }),
    sendStatus: vi.fn(function sendStatus(this: typeof res, code: number) {
      this.statusCode = code
      return this
    }),
    sendFile: vi.fn(),
    on: vi.fn(),
  }

  return res as unknown as Response & {
    statusCode: number
    body: unknown
    json: ReturnType<typeof vi.fn>
    status: ReturnType<typeof vi.fn>
    sendStatus: ReturnType<typeof vi.fn>
    cookie: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  }
}

export function mockNext() {
  return vi.fn() as unknown as NextFunction
}
