import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import Tokens from 'csrf'
import { csrfProtection, getCsrfToken } from '../../src/shared/middleware/csrf.middleware.js'
import { cacheResponse, invalidateCache } from '../../src/shared/middleware/cache.middleware.js'
import { cacheService } from '../../src/shared/services/cache.service.js'

function createCsrfApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.get('/api/csrf-token', getCsrfToken)
  app.use('/api', csrfProtection)
  app.post('/api/protected', (_req, res) => res.json({ ok: true }))
  app.post('/api/auth/local/login', (_req, res) => res.json({ loggedIn: true }))
  return app
}

describe('CSRF integration', () => {
  it('issues a CSRF cookie and token', async () => {
    const app = createCsrfApp()
    const response = await request(app).get('/api/csrf-token')
    expect(response.status).toBe(200)
    expect(response.body.csrfToken).toEqual(expect.any(String))
    expect(response.headers['set-cookie']?.join(';')).toMatch(/csrf-secret=/)
  })

  it('blocks mutating requests without a token', async () => {
    const app = createCsrfApp()
    const response = await request(app).post('/api/protected').send({ title: 'x' })
    expect(response.status).toBe(403)
    expect(response.body.error).toBe('CSRF token missing')
  })

  it('allows excluded auth paths without a CSRF token', async () => {
    const app = createCsrfApp()
    const response = await request(app).post('/api/auth/local/login').send({ email: 'a@b.c' })
    expect(response.status).toBe(200)
    expect(response.body.loggedIn).toBe(true)
  })

  it('accepts a valid token on protected mutations', async () => {
    const app = createCsrfApp()
    const bootstrap = await request(app).get('/api/csrf-token')
    const cookie = bootstrap.headers['set-cookie'][0]
    const secret = decodeURIComponent(cookie.split(';')[0].split('=')[1])
    const token = new Tokens().create(secret)

    const response = await request(app)
      .post('/api/protected')
      .set('Cookie', cookie)
      .set('x-csrf-token', token)
      .send({ title: 'ok' })

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
  })
})

describe('cache-aside integration', () => {
  beforeEach(async () => {
    await cacheService.clear()
  })

  it('serves a cached GET after the first miss and invalidates it on write', async () => {
    let hits = 0
    const app = express()
    app.use(express.json())
    app.get(
      '/items',
      cacheResponse(60, () => 'cache:items'),
      (_req, res) => {
        hits += 1
        res.json({ hits })
      },
    )
    app.post(
      '/items',
      invalidateCache('cache:items'),
      (_req, res) => {
        res.status(201).json({ created: true })
      },
    )

    const first = await request(app).get('/items')
    const second = await request(app).get('/items')
    expect(first.body).toEqual({ hits: 1 })
    expect(second.body).toEqual({ hits: 1 })
    expect(hits).toBe(1)

    await request(app).post('/items').send({})
    const third = await request(app).get('/items')
    expect(third.body).toEqual({ hits: 2 })
    expect(hits).toBe(2)
  })
})
