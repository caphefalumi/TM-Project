import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import { clearCache, getCacheStats } from '../../shared/middleware/cache.middleware.js'
import AdminController from './admin.controller.js'
import { checkAdminAccess } from './admin.middleware.js'

const router = Router()
const {
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAllAnnouncementsForAdmin,
  deleteTeamAsAdmin,
  deleteUserAsAdmin,
  deleteAnnouncementAsAdmin,
  sendNotificationToUser,
} = AdminController

router.get('/teams', authenticateAccessToken, checkAdminAccess, getAllTeamsForAdmin)
router.get('/users', authenticateAccessToken, checkAdminAccess, getAllUsersForAdmin)
router.get(
  '/announcements',
  authenticateAccessToken,
  checkAdminAccess,
  getAllAnnouncementsForAdmin,
)
router.get('/cache/stats', authenticateAccessToken, checkAdminAccess, getCacheStats)
router.delete('/cache', authenticateAccessToken, checkAdminAccess, clearCache)
router.post('/notify', authenticateAccessToken, checkAdminAccess, sendNotificationToUser)
router.delete('/teams/:teamId', authenticateAccessToken, checkAdminAccess, deleteTeamAsAdmin)
router.delete('/users/:userId', authenticateAccessToken, checkAdminAccess, deleteUserAsAdmin)
router.delete(
  '/announcements/:announcementId',
  authenticateAccessToken,
  checkAdminAccess,
  deleteAnnouncementAsAdmin,
)

export default router
