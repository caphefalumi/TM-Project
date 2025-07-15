import { Notifications, NotificationPreferences } from '../models/Notifications.js'
import Account from '../models/Account.js'
import Teams from '../models/Teams.js'
import connectDB from '../config/db.js'

/**
 * Notification Service
 * Handles creation, retrieval, and management of notifications
 */

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.recipientUserId - User ID who will receive the notification
 * @param {string} notificationData.actorUserId - User ID who triggered the notification (optional)
 * @param {string} notificationData.type - Type of notification
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {Object} notificationData.relatedData - Related data (teamId, announcementId, etc.)
 */
const createNotification = async (notificationData) => {
  await connectDB()

  try {
    const {
      recipientUserId,
      actorUserId,
      type,
      title,
      message,
      relatedData = {},
    } = notificationData

    // Check if the recipient has this type of notification enabled
    const userPreferences = await getUserNotificationPreferences(recipientUserId)

    if (
      !userPreferences.preferences[type]?.enabled ||
      !userPreferences.globalSettings.enableAllNotifications
    ) {
      console.log(`Notification ${type} is disabled for user ${recipientUserId}`)
      return null
    }

    // Create the notification
    const notification = new Notifications({
      recipientUserId,
      actorUserId,
      type,
      title,
      message,
      relatedData,
    })

    const savedNotification = await notification.save()

    // Clean up old notifications if user has a limit set
    await cleanupOldNotifications(
      recipientUserId,
      userPreferences.globalSettings.maxNotificationsToKeep,
    )

    console.log(`Notification created for user ${recipientUserId}:`, savedNotification)
    return savedNotification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Get user's notification preferences, create default if not exists
 */
const getUserNotificationPreferences = async (userId) => {
  await connectDB()

  try {
    let preferences = await NotificationPreferences.findOne({ userId })

    if (!preferences) {
      // Create default preferences for new user
      preferences = new NotificationPreferences({ userId })
      await preferences.save()
    }

    return preferences
  } catch (error) {
    console.error('Error getting user notification preferences:', error)
    throw error
  }
}

/**
 * Clean up old notifications to maintain user's preferred limit
 */
const cleanupOldNotifications = async (userId, maxNotifications) => {
  if (!maxNotifications || maxNotifications <= 0) return

  try {
    const notificationCount = await Notifications.countDocuments({ recipientUserId: userId })

    if (notificationCount > maxNotifications) {
      const notificationsToDelete = notificationCount - maxNotifications

      // Get the oldest notifications to delete
      const oldNotifications = await Notifications.find({ recipientUserId: userId })
        .sort({ createdAt: 1 })
        .limit(notificationsToDelete)
        .select('_id')

      const idsToDelete = oldNotifications.map((n) => n._id)
      await Notifications.deleteMany({ _id: { $in: idsToDelete } })

      console.log(`Cleaned up ${notificationsToDelete} old notifications for user ${userId}`)
    }
  } catch (error) {
    console.error('Error cleaning up old notifications:', error)
  }
}

/**
 * Notification creators for specific events
 */

/**
 * Create notification when user is added to a team
 */
const createTeamMemberAddedNotification = async (newMemberUserId, teamId, addedByUserId) => {
  await connectDB()

  try {
    // Get team and actor details
    const team = await Teams.findById(teamId)
    const actor = await Account.findById(addedByUserId)

    if (!team || !actor) {
      console.error('Team or actor not found for team member added notification')
      return null
    }

    return await createNotification({
      recipientUserId: newMemberUserId,
      actorUserId: addedByUserId,
      type: 'team_member_added',
      title: 'Added to Team',
      message: `${actor.username} added you to the team "${team.title}"`,
      relatedData: {
        teamId: teamId,
        teamName: team.title,
      },
    })
  } catch (error) {
    console.error('Error creating team member added notification:', error)
    throw error
  }
}

/**
 * Create notification when someone likes user's announcement
 */
const createAnnouncementLikedNotification = async (
  announcementCreatorUserId,
  announcementId,
  announcementTitle,
  likerUserId,
  teamId = null,
) => {
  await connectDB()

  try {
    // Don't notify if user liked their own announcement
    if (announcementCreatorUserId === likerUserId) return null

    const liker = await Account.findById(likerUserId)
    if (!liker) {
      console.error('Liker not found for announcement liked notification')
      return null
    }

    return await createNotification({
      recipientUserId: announcementCreatorUserId,
      actorUserId: likerUserId,
      type: 'announcement_liked',
      title: 'Announcement Liked',
      message: `${liker.username} liked your announcement "${announcementTitle}"`,
      relatedData: {
        announcementId: announcementId,
        announcementTitle: announcementTitle,
        ...(teamId && { teamId: teamId }),
      },
    })
  } catch (error) {
    console.error('Error creating announcement liked notification:', error)
    throw error
  }
}

/**
 * Create notification when someone comments on user's announcement
 */
const createAnnouncementCommentedNotification = async (
  announcementCreatorUserId,
  announcementId,
  announcementTitle,
  commenterUserId,
  commentId,
  teamId = null,
) => {
  await connectDB()

  try {
    // Don't notify if user commented on their own announcement
    if (announcementCreatorUserId === commenterUserId) return null

    const commenter = await Account.findById(commenterUserId)
    if (!commenter) {
      console.error('Commenter not found for announcement commented notification')
      return null
    }

    return await createNotification({
      recipientUserId: announcementCreatorUserId,
      actorUserId: commenterUserId,
      type: 'announcement_commented',
      title: 'New Comment',
      message: `${commenter.username} commented on your announcement "${announcementTitle}"`,
      relatedData: {
        announcementId: announcementId,
        announcementTitle: announcementTitle,
        commentId: commentId,
        ...(teamId && { teamId: teamId }),
      },
    })
  } catch (error) {
    console.error('Error creating announcement commented notification:', error)
    throw error
  }
}

/**
 * Create notification when someone replies to user's comment
 */
const createCommentRepliedNotification = async (
  originalCommenterUserId,
  announcementId,
  announcementTitle,
  replierUserId,
  commentId,
  parentCommentId,
  teamId = null,
) => {
  await connectDB()

  try {
    // Don't notify if user replied to their own comment
    if (originalCommenterUserId === replierUserId) return null

    const replier = await Account.findById(replierUserId)
    if (!replier) {
      console.error('Replier not found for comment replied notification')
      return null
    }

    return await createNotification({
      recipientUserId: originalCommenterUserId,
      actorUserId: replierUserId,
      type: 'comment_replied',
      title: 'Comment Reply',
      message: `${replier.username} replied to your comment on "${announcementTitle}"`,
      relatedData: {
        announcementId: announcementId,
        announcementTitle: announcementTitle,
        commentId: commentId,
        parentCommentId: parentCommentId,
        ...(teamId && { teamId: teamId }),
      },
    })
  } catch (error) {
    console.error('Error creating comment replied notification:', error)
    throw error
  }
}

/**
 * Create notification when new announcement is created in user's team
 */
const createTeamAnnouncementCreatedNotification = async (
  teamId,
  announcementId,
  announcementTitle,
  creatorUserId,
  teamMemberUserIds,
) => {
  await connectDB()

  try {
    const team = await Teams.findById(teamId)
    const creator = await Account.findById(creatorUserId)

    if (!team || !creator) {
      console.error('Team or creator not found for team announcement created notification')
      return null
    }

    const notifications = []

    // Create notification for each team member (except the creator)
    for (const memberUserId of teamMemberUserIds) {
      if (memberUserId !== creatorUserId) {
        const notification = await createNotification({
          recipientUserId: memberUserId,
          actorUserId: creatorUserId,
          type: 'team_announcement_created',
          title: 'New Team Announcement',
          message: `${creator.username} posted a new announcement in ${team.title}: "${announcementTitle}"`,
          relatedData: {
            teamId: teamId,
            teamName: team.title,
            announcementId: announcementId,
            announcementTitle: announcementTitle,
          },
        })

        if (notification) {
          notifications.push(notification)
        }
      }
    }

    return notifications
  } catch (error) {
    console.error('Error creating team announcement created notifications:', error)
    throw error
  }
}

export {
  createNotification,
  getUserNotificationPreferences,
  createTeamMemberAddedNotification,
  createAnnouncementLikedNotification,
  createAnnouncementCommentedNotification,
  createCommentRepliedNotification,
  createTeamAnnouncementCreatedNotification,
}
