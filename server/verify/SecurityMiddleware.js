import SessionManager from '../scripts/sessionManager.js'

// Middleware to track and validate IP addresses
export const ipSecurityMiddleware = async (req, res, next) => {
  try {
    const currentIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
    const sessionId = req.cookies.sessionId
    const userId = req.user?.userId

    if (sessionId && userId) {
      // Get the session to check original IP
      const session = await SessionManager.validateSession(sessionId, userId)

      if (session && session.ipAddress !== currentIP) {
        console.log(`IP mismatch detected for user ${userId}: original=${session.ipAddress}, current=${currentIP}`)

        // You can choose to:
        // 1. Just log the event
        // 2. Revoke the session
        // 3. Require re-authentication
        // 4. Allow but mark as suspicious

        // For now, we'll just log and continue, but you can uncomment the following to revoke session:
        // await SessionManager.revokeSession(sessionId, 'security')
        // return res.status(403).json({ error: 'Session security violation detected' })

        // Or add a warning header
        res.set('X-Security-Warning', 'IP-Change-Detected')
      }
    }

    next()
  } catch (error) {
    console.error('Error in IP security middleware:', error)
    next() // Continue even if security check fails
  }
}

// Middleware to check for concurrent sessions
export const concurrentSessionMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.userId

    if (userId) {
      const suspiciousActivity = await SessionManager.checkSuspiciousActivity(userId)

      if (suspiciousActivity.isSuspicious) {
        console.log(`Suspicious activity detected for user ${userId}:`, suspiciousActivity)

        // Add warning header
        res.set('X-Security-Warning', 'Multiple-Sessions-Detected')
        res.set('X-Session-Count', suspiciousActivity.sessionCount.toString())
        res.set('X-Unique-IPs', suspiciousActivity.uniqueIPs.toString())
      }
    }

    next()
  } catch (error) {
    console.error('Error in concurrent session middleware:', error)
    next()
  }
}

// Rate limiting per session
export const sessionRateLimit = (maxRequests = 60, windowMs = 60000) => {
  const sessions = new Map()

  return (req, res, next) => {
    const sessionId = req.cookies.sessionId

    if (!sessionId) {
      return next()
    }

    const now = Date.now()
    const sessionData = sessions.get(sessionId) || { requests: 0, resetTime: now + windowMs }

    if (now > sessionData.resetTime) {
      sessionData.requests = 0
      sessionData.resetTime = now + windowMs
    }

    sessionData.requests++

    if (sessionData.requests > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this session',
        retryAfter: Math.ceil((sessionData.resetTime - now) / 1000)
      })
    }

    sessions.set(sessionId, sessionData)

    // Clean up old entries
    if (sessions.size > 10000) {
      for (const [id, data] of sessions.entries()) {
        if (now > data.resetTime) {
          sessions.delete(id)
        }
      }
    }

    next()
  }
}

export default {
  ipSecurityMiddleware,
  concurrentSessionMiddleware,
  sessionRateLimit
}
