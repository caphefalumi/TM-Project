import express from 'express'
import NotificationsController from '../controllers/notificationsController.js'

const router = express.Router()
const {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
} = NotificationsController

router.get('/:userId', getUserNotifications)
router.delete('/:userId', deleteNotifications)

router.get('/:userId/preferences', getNotificationPreferences)
router.put('/:userId/preferences', updateNotificationPreferences)

router.get('/:userId/stats', getNotificationStats)

router.post('/:userId/mark-read', markNotificationsAsRead)

export default router
