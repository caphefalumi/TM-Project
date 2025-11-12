import express from 'express'
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
import commentsRoutes from './comments_routes.js'
import sprintRoutes from './sprint_routes.js'
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
router.use('/auth', authRoutes) // /auth/*
router.use('/users', userRoutes) // /users/*
router.use('/teams', teamRoutes) // /teams/*
router.use('/tasks', taskRoutes) // /tasks/*
router.use('/announcements', announcementRoutes) // /announcements/*
router.use('/notifications', notificationRoutes) // /notifications/*
router.use('/admin', adminRoutes) // /admin/*
router.use('/sessions', refreshTokenRoutes) // /sessions/*
router.use('/ratings', ratingRoutes) // /ratings/*
router.use('/images', imageRoutes) // /images/*
router.use('/comments', commentsRoutes) // /comments/*
router.use('/sprints', sprintRoutes) // /sprints/*
export default router
