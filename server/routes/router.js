import express from 'express'
import path from 'path'

// Import sub-route files
import authRoutes from './auth_routes.js'
import userRoutes from './users_routes.js'
import teamRoutes from './teams_routes.js'
import taskRoutes from './tasks_routes.js'
import ratingRoutes from './rating_routes.js'
import announcementRoutes from './announcements_routes.js'
import notificationRoutes from './notifications_routes.js'
import adminRoutes from './admin_routes.js'
import refreshTokenRoutes from './refreshToken_routes.js'
import imageRoutes from './image_routes.js'
import { rateLimit } from 'express-rate-limit'
const router = express.Router()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 52, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // store: ... , // Redis, Memcached, etc. See below.
})

// Instead of defining all endpoints here, delegate them:
router.use('/api/auth', authRoutes) // /api/auth/*
router.use('/api/users', userRoutes) // /api/users/*
router.use('/api/teams', teamRoutes) // /api/teams/*
router.use('/api/tasks', taskRoutes) // /api/tasks/*
router.use('/api/announcements', announcementRoutes) // /api/announcements/*
router.use('/api/notifications', notificationRoutes) // /api/notifications/*
router.use('/api/admin', adminRoutes) // /api/admin/*
router.use('/api/sessions', refreshTokenRoutes) // /api/sessions/*
router.use('/api/ratings', ratingRoutes) // /api/ratings/*
router.use('/api/images', imageRoutes) // /api/images/*
export default router
