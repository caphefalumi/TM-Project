import * as notificationsService from './notifications.service.js'

const sendResult = async (
  res: any,
  operation: Promise<notificationsService.NotificationServiceResult>,
) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const getUserNotifications = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      notificationsService.getUserNotifications(req.params.userId, req.query),
    )
  } catch (error) {
    console.log('Error fetching user notifications:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const markNotificationsAsRead = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      notificationsService.markNotificationsAsRead(req.params.userId, req.body),
    )
  } catch (error) {
    console.log('Error marking notifications as read:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteNotifications = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      notificationsService.deleteNotifications(req.params.userId, req.body),
    )
  } catch (error) {
    console.log('Error deleting notifications:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getNotificationPreferences = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      notificationsService.getNotificationPreferences(req.params.userId),
    )
  } catch (error) {
    console.log('Error fetching notification preferences:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateNotificationPreferences = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      notificationsService.updateNotificationPreferences(req.params.userId, req.body),
    )
  } catch (error) {
    console.log('Error updating notification preferences:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getNotificationStats = async (req: any, res: any) => {
  try {
    return await sendResult(res, notificationsService.getNotificationStats(req.params.userId))
  } catch (error) {
    console.log('Error fetching notification stats:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
}
