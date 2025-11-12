import { doubleCsrf } from 'csrf-csrf'

// CSRF Protection Configuration
const doubleCsrfOptions = {
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-please-change-in-production',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    // Try to get token from header first, then body
    return req.headers['x-csrf-token'] || req.body?._csrf
  },
}

const { generateToken, doubleCsrfProtection } = doubleCsrf(doubleCsrfOptions)

// Middleware to generate and attach CSRF token
export const csrfProtection = doubleCsrfProtection

// Route handler to provide CSRF token to clients
export const getCsrfToken = (req, res) => {
  const token = generateToken(req, res)
  res.json({ csrfToken: token })
}

export default {
  csrfProtection,
  getCsrfToken,
}
