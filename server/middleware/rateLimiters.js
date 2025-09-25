import { rateLimit } from 'express-rate-limit'

const createLimiter = ({ windowMs, max, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipFailedRequests: false,
    message,
    keyGenerator,
  })

export const loginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many login attempts from this source. Please wait and try again.',
  },
  keyGenerator: (req) => `${req.clientIp}:${(req.body.username || '').toLowerCase()}`,
})

export const registerRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many registration attempts from this IP. Please try again later.',
  },
  keyGenerator: (req) => req.clientIp,
})

export const passwordResetRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many password reset requests. Please try again later.',
  },
  keyGenerator: (req) => req.clientIp,
})
