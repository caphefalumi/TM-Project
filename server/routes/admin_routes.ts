import express from 'express'
import AdminController from '../controllers/adminController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { checkAdminAccess } from '../middleware/adminMiddleware.js'

const router = express.Router()
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
router.get('/announcements', authenticateAccessToken, checkAdminAccess, getAllAnnouncementsForAdmin)

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
