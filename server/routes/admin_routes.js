import express from 'express'
import Admin from './admin.js'
import JWTAuth from '../verify/JWTAuth.js'

const router = express.Router()
const { authenticateAccessToken } = JWTAuth
const {
  checkAdminAccess,
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAllAnnouncementsForAdmin,
  deleteTeamAsAdmin,
  deleteUserAsAdmin,
  deleteAnnouncementAsAdmin,
  sendNotificationToUser,
  getUserSessionsForAdmin,
  revokeSessionAsAdmin,
  revokeAllSessionsForUser,
  getAdminAuditLogs,
} = Admin

// Admin Dashboard
router.get('/teams', authenticateAccessToken, checkAdminAccess, getAllTeamsForAdmin)
router.get('/users', authenticateAccessToken, checkAdminAccess, getAllUsersForAdmin)
router.get('/announcements', authenticateAccessToken, checkAdminAccess, getAllAnnouncementsForAdmin)

// Admin Actions
router.post('/notify', authenticateAccessToken, checkAdminAccess, sendNotificationToUser)
router.delete('/teams/:teamId', authenticateAccessToken, checkAdminAccess, deleteTeamAsAdmin)
router.delete('/users/:userId', authenticateAccessToken, checkAdminAccess, deleteUserAsAdmin)
router.delete(
  '/announcements/:announcementId',
  authenticateAccessToken,
  checkAdminAccess,
  deleteAnnouncementAsAdmin,
)

// Session Management
router.get('/sessions/:userId', authenticateAccessToken, checkAdminAccess, getUserSessionsForAdmin)
router.delete('/sessions/:sessionId', authenticateAccessToken, checkAdminAccess, revokeSessionAsAdmin)
router.post(
  '/sessions/:userId/revoke-all',
  authenticateAccessToken,
  checkAdminAccess,
  revokeAllSessionsForUser,
)

// Audit logs
router.get('/audit/logs', authenticateAccessToken, checkAdminAccess, getAdminAuditLogs)

export default router
