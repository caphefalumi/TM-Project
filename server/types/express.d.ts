import 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        username: string
        email?: string
        [key: string]: unknown
      }
      clientIp?: string
    }
  }
}

export {}
