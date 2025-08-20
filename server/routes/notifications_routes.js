import express from 'express'
import Notifications from '../api/notifications.js'

const router = express.Router()
const {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
} = Notifications

// Notifications
router.get('/:userId', getUserNotifications)
router.delete('/:userId', deleteNotifications)

// Preferences
router.get('/:userId/preferences', getNotificationPreferences)
router.put('/:userId/preferences', updateNotificationPreferences)

// Stats
router.get('/:userId/stats', getNotificationStats)

// Mark read
router.post('/:userId/mark-read', markNotificationsAsRead)

export default router
