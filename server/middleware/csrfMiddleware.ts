import Tokens from "csrf"
const isProduction = process.env.NODE_ENV === 'production'
const tokens = new Tokens()

const CSRF_SECRET_COOKIE = isProduction ? '__Host-csrf-secret' : 'csrf-secret'
const IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS']
const EXCLUDED_PATHS = [
  '/api/auth/oauth',
  '/api/auth/google/register',
  '/api/auth/google/callback',
  '/api/auth/local/register',
  '/api/auth/local/login',
  '/api/auth/forgot-password',
  '/api/auth/verify-reset-token',
  '/api/auth/reset-password',
  '/api/auth/resend-verification',
  '/api/sessions/me',
]

const cookieOptions = {
  sameSite: 'lax',
  path: '/',
  secure: isProduction,
  httpOnly: true,
}

// Middleware to verify CSRF token
export const csrfProtection = (req, res, next) => {
  if (IGNORED_METHODS.includes(req.method)) {
    return next()
  }

  if (EXCLUDED_PATHS.some((path) => req.originalUrl.startsWith(path))) {
    return next()
  }

  const secret = req.cookies[CSRF_SECRET_COOKIE]
  const token = req.headers['x-csrf-token'] || req.body?._csrf

  if (!secret || !token) {
    return res.status(403).json({ error: 'CSRF token missing' })
  }

  if (!tokens.verify(secret, token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' })
  }

  next()
}

// Route handler to provide CSRF token to clients
export const getCsrfToken = (req, res) => {
  let secret = req.cookies[CSRF_SECRET_COOKIE]

  if (!secret) {
    secret = tokens.secretSync()
    res.cookie(CSRF_SECRET_COOKIE, secret, cookieOptions)
  }

  const token = tokens.create(secret)
  res.json({ csrfToken: token })
}

export default {
  csrfProtection,
  getCsrfToken,
}
