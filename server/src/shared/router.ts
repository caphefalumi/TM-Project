import express from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import sessionRoutes from '../modules/auth/session.routes.js'
import userRoutes from '../modules/users/users.routes.js'
import teamRoutes from '../modules/teams/teams.routes.js'
import taskRoutes from '../modules/tasks/tasks.routes.js'
import ratingRoutes from '../modules/ratings/rating.routes.js'
import announcementRoutes from '../modules/announcements/announcements.routes.js'
import notificationRoutes from '../modules/notifications/notifications.routes.js'
import adminRoutes from '../modules/admin/admin.routes.js'
import imageRoutes from '../modules/images/images.routes.js'
import commentsRoutes from '../modules/comments/comments.routes.js'
import sprintRoutes from '../modules/sprints/sprint.routes.js'
import createRateLimiter from './middleware/rate-limiter.middleware.js'

const router = express.Router()

const limiter = createRateLimiter(
  {
    windowMs: 15 * 60 * 1000,
    limit: 100,
    ipv6Subnet: 52,
  },
  'rl:global:',
)

// Global limiter is constructed for Redis-backed rate limiting when wired by callers.
void limiter

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/teams', teamRoutes)
router.use('/tasks', taskRoutes)
router.use('/announcements', announcementRoutes)
router.use('/notifications', notificationRoutes)
router.use('/admin', adminRoutes)
router.use('/sessions', sessionRoutes)
router.use('/ratings', ratingRoutes)
router.use('/images', imageRoutes)
router.use('/comments', commentsRoutes)
router.use('/sprints', sprintRoutes)

export default router
