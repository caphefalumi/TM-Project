import { doubleCsrf } from 'csrf-csrf'

// CSRF Protection Configuration
const doubleCsrfOptions = {
  getSecret: (req) => process.env.CSRF_SECRET || 'default-csrf-secret-please-change-in-production',
  getSessionIdentifier: (req) => {
    // Use user ID from JWT if available, otherwise use 'anonymous'
    return req.user?.userId?.toString() || 'anonymous'
  },
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf
  },
}

// The library exposes `generateCsrfToken` and `doubleCsrfProtection`
// (not `generateToken`) — align with the package API.
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf(doubleCsrfOptions)

// Middleware to generate and attach CSRF token
export const csrfProtection = doubleCsrfProtection

// Route handler to provide CSRF token to clients
export const getCsrfToken = (req, res) => {
  const token = generateCsrfToken(req, res)
  res.json({ csrfToken: token })
}

export default {
  csrfProtection,
  getCsrfToken,
}
