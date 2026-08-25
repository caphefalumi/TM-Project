import Account from '../auth/account.model.js'
import Teams from '../teams/team.model.js'
import { Notifications, NotificationPreferences } from './notification.model.js'

export type NotificationServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): NotificationServiceResult => ({
  status,
  body,
})

export const getUserNotificationPreferences = async (userId: string) => {
  try {
    let preferences = await NotificationPreferences.findOne({ userId })
    if (!preferences) {
      preferences = new NotificationPreferences({ userId })
      await preferences.save()
    }
    return preferences
  } catch (error) {
    console.log('Error getting user notification preferences:', error)
    throw error
  }
}

export const cleanupOldNotifications = async (userId: string, maxNotifications: number) => {
  if (!maxNotifications || maxNotifications <= 0) return

  try {
    const notificationCount = await Notifications.countDocuments({ recipientUserId: userId })
    if (notificationCount > maxNotifications) {
      const notificationsToDelete = notificationCount - maxNotifications
      const oldNotifications = await Notifications.find({ recipientUserId: userId })
        .sort({ createdAt: 1 })
        .limit(notificationsToDelete)
        .select('_id')
      const idsToDelete = oldNotifications.map((notification) => notification._id)
      await Notifications.deleteMany({ _id: { $in: idsToDelete } })
      console.log(`Cleaned up ${notificationsToDelete} old notifications for user ${userId}`)
    }
  } catch (error) {
    console.log('Error cleaning up old notifications:', error)
  }
}

export const createNotification = async (notificationData: any) => {
  try {
    const {
      recipientUserId,
      actorUserId,
      type,
      title,
      message,
      relatedData = {},
    } = notificationData

    let userPreferences: any = null
    if (type !== 'admin') {
      userPreferences = await getUserNotificationPreferences(recipientUserId)
      if (
        !userPreferences.preferences[type]?.enabled ||
        !userPreferences.globalSettings.enableAllNotifications
      ) {
        return null
      }
    } else {
      try {
        userPreferences = await getUserNotificationPreferences(recipientUserId)
      } catch (error: any) {
        console.warn(
          'Could not get user preferences for admin notification cleanup:',
          error.message,
        )
        userPreferences = { globalSettings: { maxNotificationsToKeep: 100 } }
      }
    }

    const notification = new Notifications({
      recipientUserId,
      actorUserId,
      type,
      title,
      message,
      relatedData,
    })
    const savedNotification = await notification.save()

    await cleanupOldNotifications(
      recipientUserId,
      userPreferences?.globalSettings?.maxNotificationsToKeep || 100,
    )

    console.log(`Notification created for user ${recipientUserId}:`, savedNotification)
    return savedNotification
  } catch (error) {
    console.log('Error creating notification:', error)
    throw error
  }
}

export const createTeamMemberAddedNotification = async (
  newMemberUserId: any,
  teamId: any,
  addedByUserId: any,
) => {
  try {
    const team = await Teams.findById(teamId)
    const actor = await Account.findById(addedByUserId)
    if (!team || !actor) {
      console.log('Team or actor not found for team member added notification')
      return null
    }

    return await createNotification({
      recipientUserId: newMemberUserId.toString(),
      actorUserId: addedByUserId.toString(),
      type: 'team_member_added',
      title: 'Added to Team',
      message: `${actor.username} added you to the team "${team.title}"`,
      relatedData: { teamId: teamId.toString(), teamName: team.title },
    })
  } catch (error) {
    console.log('Error creating team member added notification:', error)
    throw error
  }
}

export const createAnnouncementLikedNotification = async (
  announcementCreatorUserId: any,
  announcementId: any,
  announcementTitle: string,
  likerUserId: any,
  teamId: any = null,
) => {
  try {
    const creatorIdStr = announcementCreatorUserId.toString()
    const likerIdStr = likerUserId.toString()
    if (creatorIdStr === likerIdStr) return null

    const liker = await Account.findById(likerUserId)
    if (!liker) {
      console.log('Liker not found for announcement liked notification')
      return null
    }

    return await createNotification({
      recipientUserId: creatorIdStr,
      actorUserId: likerIdStr,
      type: 'announcement_liked',
      title: 'Announcement Liked',
      message: `${liker.username} liked your announcement "${announcementTitle}"`,
      relatedData: {
        announcementId: announcementId.toString(),
        announcementTitle,
        ...(teamId && { teamId: teamId.toString() }),
      },
    })
  } catch (error) {
    console.log('Error creating announcement liked notification:', error)
    throw error
  }
}

export const createAnnouncementCommentedNotification = async (
  announcementCreatorUserId: any,
  announcementId: any,
  announcementTitle: string,
  commenterUserId: any,
  commentId: any,
  teamId: any = null,
) => {
  try {
    const creatorIdStr = announcementCreatorUserId.toString()
    const commenterIdStr = commenterUserId.toString()
    if (creatorIdStr === commenterIdStr) return null

    const commenter = await Account.findById(commenterUserId)
    if (!commenter) {
      console.log('Commenter not found for announcement commented notification')
      return null
    }

    return await createNotification({
      recipientUserId: creatorIdStr,
      actorUserId: commenterIdStr,
      type: 'announcement_commented',
      title: 'New Comment',
      message: `${commenter.username} commented on your announcement "${announcementTitle}"`,
      relatedData: {
        announcementId: announcementId.toString(),
        announcementTitle,
        commentId: commentId.toString(),
        ...(teamId && { teamId: teamId.toString() }),
      },
    })
  } catch (error) {
    console.log('Error creating announcement commented notification:', error)
    throw error
  }
}

export const createCommentRepliedNotification = async (
  originalCommenterUserId: any,
  announcementId: any,
  announcementTitle: string,
  replierUserId: any,
  commentId: any,
  parentCommentId: any,
  teamId: any = null,
) => {
  try {
    const originalIdStr = originalCommenterUserId.toString()
    const replierIdStr = replierUserId.toString()
    if (originalIdStr === replierIdStr) return null

    const replier = await Account.findById(replierUserId)
    if (!replier) {
      console.log('Replier not found for comment replied notification')
      return null
    }

    return await createNotification({
      recipientUserId: originalIdStr,
      actorUserId: replierIdStr,
      type: 'comment_replied',
      title: 'Comment Reply',
      message: `${replier.username} replied to your comment on "${announcementTitle}"`,
      relatedData: {
        announcementId: announcementId.toString(),
        announcementTitle,
        commentId: commentId.toString(),
        parentCommentId: parentCommentId.toString(),
        ...(teamId && { teamId: teamId.toString() }),
      },
    })
  } catch (error) {
    console.log('Error creating comment replied notification:', error)
    throw error
  }
}

export const createTeamAnnouncementCreatedNotification = async (
  teamId: any,
  announcementId: any,
  announcementTitle: string,
  creatorUserId: any,
  teamMemberUserIds: any[],
) => {
  try {
    const team = await Teams.findById(teamId)
    const creator = await Account.findById(creatorUserId)
    if (!team || !creator) {
      console.log('Team or creator not found for team announcement created notification')
      return null
    }

    const notifications = []
    const creatorIdStr = creatorUserId.toString()
    for (const memberUserId of teamMemberUserIds) {
      const memberIdStr = memberUserId.toString()
      if (memberIdStr !== creatorIdStr) {
        const notification = await createNotification({
          recipientUserId: memberIdStr,
          actorUserId: creatorIdStr,
          type: 'team_announcement_created',
          title: 'New Team Announcement',
          message: `${creator.username} posted a new announcement in ${team.title}: "${announcementTitle}"`,
          relatedData: {
            teamId: teamId.toString(),
            teamName: team.title,
            announcementId: announcementId.toString(),
            announcementTitle,
          },
        })
        if (notification) {
          notifications.push(notification)
        }
      }
    }
    return notifications
  } catch (error) {
    console.log('Error creating team announcement created notifications:', error)
    throw error
  }
}

export const getUserNotifications = async (
  userId: string,
  options: any,
): Promise<NotificationServiceResult> => {
  const { page = 1, limit = 20, unreadOnly = false, type } = options
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }

  const query: any = { recipientUserId: userId }
  if (unreadOnly === 'true') query.isRead = false
  if (type) query.type = type

  const parsedPage = parseInt(page)
  const parsedLimit = parseInt(limit)
  const skip = (parsedPage - 1) * parsedLimit
  const notifications = await Notifications.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
  const totalCount = await Notifications.countDocuments(query)
  const unreadCount = await Notifications.countDocuments({
    recipientUserId: userId,
    isRead: false,
  })

  const enrichedNotifications = await Promise.all(
    notifications.map(async (notification) => {
      const notificationObj: any = notification.toObject()
      if (notification.actorUserId) {
        const actor = await Account.findById(notification.actorUserId, 'username')
        notificationObj.actorUsername = actor?.username || 'Unknown User'
      }
      return notificationObj
    }),
  )

  return result(200, {
    notifications: enrichedNotifications,
    pagination: {
      currentPage: parsedPage,
      totalPages: Math.ceil(totalCount / parsedLimit),
      totalCount,
      unreadCount,
      hasMore: skip + notifications.length < totalCount,
    },
  })
}

export const markNotificationsAsRead = async (
  userId: string,
  body: any,
): Promise<NotificationServiceResult> => {
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }

  const { notificationId, notificationIds, markAllAsRead } = body
  const updateQuery: any = { recipientUserId: userId, isRead: false }
  let updateCount = 0

  if (markAllAsRead) {
    const updateResult = await Notifications.updateMany(updateQuery, {
      isRead: true,
      readAt: new Date(),
    })
    updateCount = updateResult.modifiedCount
  } else if (notificationId) {
    updateQuery._id = notificationId
    const updateResult = await Notifications.updateOne(updateQuery, {
      isRead: true,
      readAt: new Date(),
    })
    updateCount = updateResult.modifiedCount
  } else if (notificationIds && Array.isArray(notificationIds)) {
    updateQuery._id = { $in: notificationIds }
    const updateResult = await Notifications.updateMany(updateQuery, {
      isRead: true,
      readAt: new Date(),
    })
    updateCount = updateResult.modifiedCount
  } else {
    return result(400, {
      message: 'Either notificationId, notificationIds, or markAllAsRead must be provided',
    })
  }

  return result(200, {
    message: `${updateCount} notification(s) marked as read`,
    updatedCount: updateCount,
  })
}

export const deleteNotifications = async (
  userId: string,
  body: any,
): Promise<NotificationServiceResult> => {
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }

  const { notificationId, notificationIds, deleteAll } = body
  const deleteQuery: any = { recipientUserId: userId }
  let deleteCount = 0

  if (deleteAll) {
    const deleteResult = await Notifications.deleteMany(deleteQuery)
    deleteCount = deleteResult.deletedCount
  } else if (notificationId) {
    deleteQuery._id = notificationId
    const deleteResult = await Notifications.deleteOne(deleteQuery)
    deleteCount = deleteResult.deletedCount
  } else if (notificationIds && Array.isArray(notificationIds)) {
    deleteQuery._id = { $in: notificationIds }
    const deleteResult = await Notifications.deleteMany(deleteQuery)
    deleteCount = deleteResult.deletedCount
  } else {
    return result(400, {
      message: 'Either notificationId, notificationIds, or deleteAll must be provided',
    })
  }

  return result(200, {
    message: `${deleteCount} notification(s) deleted`,
    deletedCount: deleteCount,
  })
}

export const getNotificationPreferences = async (
  userId: string,
): Promise<NotificationServiceResult> => {
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }
  const preferences = await getUserNotificationPreferences(userId)
  return result(200, { preferences })
}

export const updateNotificationPreferences = async (
  userId: string,
  body: any,
): Promise<NotificationServiceResult> => {
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }

  const { preferences, globalSettings } = body
  let userPreferences: any = await NotificationPreferences.findOne({ userId })
  if (!userPreferences) {
    userPreferences = new NotificationPreferences({ userId })
  }

  if (preferences) {
    Object.keys(preferences).forEach((key) => {
      if (userPreferences.preferences[key]) {
        Object.assign(userPreferences.preferences[key], preferences[key])
      }
    })
  }
  if (globalSettings) {
    Object.assign(userPreferences.globalSettings, globalSettings)
  }
  await userPreferences.save()

  return result(200, {
    message: 'Notification preferences updated successfully',
    preferences: userPreferences,
  })
}

export const getNotificationStats = async (
  userId: string,
): Promise<NotificationServiceResult> => {
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }

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

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentCount = await Notifications.countDocuments({
    recipientUserId: userId,
    createdAt: { $gte: sevenDaysAgo },
  })

  return result(200, {
    stats: {
      total: totalCount,
      unread: unreadCount,
      read: readCount,
      recent: recentCount,
      byType: typeStats.reduce<Record<string, number>>((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {}),
    },
  })
}

export default {
  createNotification,
  getUserNotificationPreferences,
  cleanupOldNotifications,
  createTeamMemberAddedNotification,
  createAnnouncementLikedNotification,
  createAnnouncementCommentedNotification,
  createCommentRepliedNotification,
  createTeamAnnouncementCreatedNotification,
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
}
