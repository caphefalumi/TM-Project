import { Notifications, NotificationPreferences } from '../models/Notifications.js'
import Account from '../models/Account.js'
import Teams from '../models/Teams.js'

/**
 * Notification Service
 * Handles creation, retrieval, and management of notifications
 */

const createNotification = async (notificationData) => {
  try {
    const {
      recipientUserId,
      actorUserId,
      type,
      title,
      message,
      relatedData = {},
    } = notificationData

    // Skip preference checks for admin notifications
    let userPreferences = null
    if (type !== 'admin') {
      // Check if the recipient has this type of notification enabled
      userPreferences = await getUserNotificationPreferences(recipientUserId)

      if (
        !userPreferences.preferences[type]?.enabled ||
        !userPreferences.globalSettings.enableAllNotifications
      ) {
        return null
      }
    } else {
      // For admin notifications, try to get preferences for cleanup, but don't fail if it doesn't work
      try {
        userPreferences = await getUserNotificationPreferences(recipientUserId)
      } catch (error) {
        console.warn(
          'Could not get user preferences for admin notification cleanup:',
          error.message,
        )
        userPreferences = { globalSettings: { maxNotificationsToKeep: 100 } }
      }
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
      userPreferences?.globalSettings?.maxNotificationsToKeep || 100, // Default to 100 if no preference
    )

    console.log(`Notification created for user ${recipientUserId}:`, savedNotification)
    return savedNotification
  } catch (error) {
    console.log('Error creating notification:', error)
    throw error
  }
}

/**
 * Get user's notification preferences, create default if not exists
 */
const getUserNotificationPreferences = async (userId) => {
  try {
    let preferences = await NotificationPreferences.findOne({ userId })

    if (!preferences) {
      // Create default preferences for new user
      preferences = new NotificationPreferences({ userId })
      await preferences.save()
    }

    return preferences
  } catch (error) {
    console.log('Error getting user notification preferences:', error)
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
    console.log('Error cleaning up old notifications:', error)
  }
}

/**
 * Notification creators for specific events
 */

/**
 * Create notification when user is added to a team
 */
const createTeamMemberAddedNotification = async (newMemberUserId, teamId, addedByUserId) => {
  try {
    // Get team and actor details
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
      relatedData: {
        teamId: teamId.toString(),
        teamName: team.title,
      },
    })
  } catch (error) {
    console.log('Error creating team member added notification:', error)
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
  try {
    // Convert to strings for consistent comparison
    const creatorIdStr = announcementCreatorUserId.toString()
    const likerIdStr = likerUserId.toString()

    // Don't notify if user liked their own announcement
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
        announcementTitle: announcementTitle,
        ...(teamId && { teamId: teamId.toString() }),
      },
    })
  } catch (error) {
    console.log('Error creating announcement liked notification:', error)
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
  try {
    // Convert to strings for consistent comparison
    const creatorIdStr = announcementCreatorUserId.toString()
    const commenterIdStr = commenterUserId.toString()

    // Don't notify if user commented on their own announcement
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
        announcementTitle: announcementTitle,
        commentId: commentId.toString(),
        ...(teamId && { teamId: teamId.toString() }),
      },
    })
  } catch (error) {
    console.log('Error creating announcement commented notification:', error)
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
  try {
    // Convert to strings for consistent comparison
    const originalIdStr = originalCommenterUserId.toString()
    const replierIdStr = replierUserId.toString()

    // Don't notify if user replied to their own comment
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
        announcementTitle: announcementTitle,
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
  try {
    const team = await Teams.findById(teamId)
    const creator = await Account.findById(creatorUserId)

    if (!team || !creator) {
      console.log('Team or creator not found for team announcement created notification')
      return null
    }

    const notifications = []
    const creatorIdStr = creatorUserId.toString()

    // Create notification for each team member (except the creator)
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
    console.log('Error creating team announcement created notifications:', error)
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
