import express from 'express'

// Import sub-route files
import authRoutes from './auth_routes.js'
import userRoutes from './users_routes.js'
import teamRoutes from './teams_routes.js'
import taskRoutes from './tasks_routes.js'
import announcementRoutes from './announcements_routes.js'
import notificationRoutes from './notifications_routes.js'
import adminRoutes from './admin_routes.js'

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
