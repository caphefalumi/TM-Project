// Basic security middleware (session functionality removed)

// Middleware to track IP addresses (for logging only)
export const ipSecurityMiddleware = async (req, res, next) => {
  try {
    const currentIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
    const userId = req.user?.userId

    if (userId) {
      console.log(`Request from user ${userId} at IP: ${currentIP}`)
    }

    next()
  } catch (error) {
    console.error('Error in IP security middleware:', error)
    next() // Continue even if security check fails
  }
}

// Simple rate limiting per IP
export const ipRateLimit = (maxRequests = 60, windowMs = 60000) => {
  const ips = new Map()

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown'

    const now = Date.now()
    const ipData = ips.get(ip) || { requests: 0, resetTime: now + windowMs }

    if (now > ipData.resetTime) {
      ipData.requests = 0
      ipData.resetTime = now + windowMs
    }

    ipData.requests++

    if (ipData.requests > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil((ipData.resetTime - now) / 1000)
      })
    }

    ips.set(ip, ipData)

    // Clean up old entries
    if (ips.size > 10000) {
      for (const [ipAddr, data] of ips.entries()) {
        if (now > data.resetTime) {
          ips.delete(ipAddr)
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
