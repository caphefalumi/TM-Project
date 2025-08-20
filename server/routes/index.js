import express from 'express'

// Import sub-route files
import authRoutes from './auth.routes.js'
import userRoutes from './users.routes.js'
import teamRoutes from './teams.routes.js'
import taskRoutes from './tasks.routes.js'
import announcementRoutes from './announcements.routes.js'
import notificationRoutes from './notifications.routes.js'
import adminRoutes from './admin.routes.js'

const router = express.Router()

// Instead of defining all endpoints here, delegate them:
router.use('/account', authRoutes)            // /api/account/*
router.use('/users', userRoutes)              // /api/users/*
router.use('/teams', teamRoutes)              // /api/teams/*
router.use('/tasks', taskRoutes)              // /api/tasks/*
router.use('/announcements', announcementRoutes) // /api/announcements/*
router.use('/notifications', notificationRoutes) // /api/notifications/*
router.use('/admin', adminRoutes)             // /api/admin/*

export default router
