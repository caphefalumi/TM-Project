import { Notifications, NotificationPreferences } from '../models/Notifications.js'
import Account from '../models/Account.js'
import { getUserNotificationPreferences } from '../scripts/notificationsService.js'

/**
 * Get notifications for a user
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Number of notifications per page (default: 20)
 * - unreadOnly: Get only unread notifications (default: false)
 * - type: Filter by notification type (optional)
 */
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20, unreadOnly = false, type } = req.query

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }

    // Build query
    const query = { recipientUserId: userId }

    if (unreadOnly === 'true') {
      query.isRead = false
    }

    if (type) {
      query.type = type
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get notifications with pagination
    const notifications = await Notifications.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count for pagination info
    const totalCount = await Notifications.countDocuments(query)
    const unreadCount = await Notifications.countDocuments({
      recipientUserId: userId,
      isRead: false,
    })

    // Get actor usernames for notifications that have actorUserId
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const notificationObj = notification.toObject()

        if (notification.actorUserId) {
          const actor = await Account.findById(notification.actorUserId, 'username')
          notificationObj.actorUsername = actor?.username || 'Unknown User'
        }

        return notificationObj
      }),
    )

    return res.status(200).json({
      notifications: enrichedNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        unreadCount,
        hasMore: skip + notifications.length < totalCount,
      },
    })
  } catch (error) {
    console.log('Error fetching user notifications:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Mark notification(s) as read
 * Body can contain:
 * - notificationId: Single notification ID
 * - notificationIds: Array of notification IDs
 * - markAllAsRead: Boolean to mark all user's notifications as read
 */
const markNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params
    const { notificationId, notificationIds, markAllAsRead } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }

    let updateQuery = { recipientUserId: userId, isRead: false }
    let updateCount = 0

    if (markAllAsRead) {
      // Mark all unread notifications as read
      const result = await Notifications.updateMany(updateQuery, {
        isRead: true,
        readAt: new Date(),
      })
      updateCount = result.modifiedCount
    } else if (notificationId) {
      // Mark single notification as read
      updateQuery._id = notificationId
      const result = await Notifications.updateOne(updateQuery, {
        isRead: true,
        readAt: new Date(),
      })
      updateCount = result.modifiedCount
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark multiple notifications as read
      updateQuery._id = { $in: notificationIds }
      const result = await Notifications.updateMany(updateQuery, {
        isRead: true,
        readAt: new Date(),
      })
      updateCount = result.modifiedCount
    } else {
      return res.status(400).json({
        message: 'Either notificationId, notificationIds, or markAllAsRead must be provided',
      })
    }

    return res.status(200).json({
      message: `${updateCount} notification(s) marked as read`,
      updatedCount: updateCount,
    })
  } catch (error) {
    console.log('Error marking notifications as read:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Delete notification(s)
 * Body can contain:
 * - notificationId: Single notification ID
 * - notificationIds: Array of notification IDs
 * - deleteAll: Boolean to delete all user's notifications
 */
const deleteNotifications = async (req, res) => {
  try {
    const { userId } = req.params
    const { notificationId, notificationIds, deleteAll } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }

    let deleteQuery = { recipientUserId: userId }
    let deleteCount = 0

    if (deleteAll) {
      // Delete all user's notifications
      const result = await Notifications.deleteMany(deleteQuery)
      deleteCount = result.deletedCount
    } else if (notificationId) {
      // Delete single notification
      deleteQuery._id = notificationId
      const result = await Notifications.deleteOne(deleteQuery)
      deleteCount = result.deletedCount
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Delete multiple notifications
      deleteQuery._id = { $in: notificationIds }
      const result = await Notifications.deleteMany(deleteQuery)
      deleteCount = result.deletedCount
    } else {
      return res.status(400).json({
        message: 'Either notificationId, notificationIds, or deleteAll must be provided',
      })
    }

    return res.status(200).json({
      message: `${deleteCount} notification(s) deleted`,
      deletedCount: deleteCount,
    })
  } catch (error) {
    console.log('Error deleting notifications:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Get user's notification preferences
 */
const getNotificationPreferences = async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }

    const preferences = await getUserNotificationPreferences(userId)
    return res.status(200).json({ preferences })
  } catch (error) {
    console.log('Error fetching notification preferences:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Update user's notification preferences
 */
const updateNotificationPreferences = async (req, res) => {
  try {
    const { userId } = req.params
    const { preferences, globalSettings } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }

    // Get current preferences or create new ones
    let userPreferences = await NotificationPreferences.findOne({ userId })

    if (!userPreferences) {
      userPreferences = new NotificationPreferences({ userId })
    }

    // Update preferences if provided
    if (preferences) {
      Object.keys(preferences).forEach((key) => {
        if (userPreferences.preferences[key]) {
          Object.assign(userPreferences.preferences[key], preferences[key])
        }
      })
    }

    // Update global settings if provided
    if (globalSettings) {
      Object.assign(userPreferences.globalSettings, globalSettings)
    }

    await userPreferences.save()

    return res.status(200).json({
      message: 'Notification preferences updated successfully',
      preferences: userPreferences,
    })
  } catch (error) {
    console.log('Error updating notification preferences:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Get notification statistics for a user
 */
const getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }

    // Get various counts
    const [totalCount, unreadCount, readCount, typeStats] = await Promise.all([
      Notifications.countDocuments({ recipientUserId: userId }),
      Notifications.countDocuments({ recipientUserId: userId, isRead: false }),
      Notifications.countDocuments({ recipientUserId: userId, isRead: true }),
      Notifications.aggregate([
        { $match: { recipientUserId: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ])

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentCount = await Notifications.countDocuments({
      recipientUserId: userId,
      createdAt: { $gte: sevenDaysAgo },
    })

    return res.status(200).json({
      stats: {
        total: totalCount,
        unread: unreadCount,
        read: readCount,
        recent: recentCount,
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {}),
      },
    })
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
