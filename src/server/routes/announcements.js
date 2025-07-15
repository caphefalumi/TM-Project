import connectDB from '../config/db.js'
import {
  createAnnouncementLikedNotification,
  createAnnouncementCommentedNotification,
  createCommentRepliedNotification,
  createTeamAnnouncementCreatedNotification,
} from '../scripts/notificationsService.js'

import Teams from '../models/Teams.js'
import Announcements from '../models/Announcements.js'
import UsersOfTeam from '../models/UsersOfTeam.js'

const getAnnouncementsOfTeam = async (req, res) => {
  // Get all announcements of a team
  // Returns an array of announcements sorted by updatedAt in descending order
  // Requires teamId as a parameter
  await connectDB()
  try {
    const { teamId } = req.params
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' })
    }

    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }

    // Sorted by createdAt in descending order
    const announcements = await Announcements.find({ teamId }).sort({ updatedAt: -1 })
    if (announcements.length === 0) {
      console.log(`No announcements found for team ${teamId}`)
      return res.status(200).json({ announcements: [] })
    }
    return res.status(200).json({ announcements })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addAnnouncement = async (req, res) => {
  // Add a new announcement to a team
  // Requires teamId, title, content, and createdBy in the request body
  await connectDB()
  try {
    const { title, subtitle, content, createdBy } = req.body
    const { teamId } = req.params
    if (!teamId || !title || !content || !createdBy) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    let finalSubtitle = subtitle
    if (subtitle == undefined || subtitle == null) {
      finalSubtitle = ''
    }

    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }

    const newAnnouncement = new Announcements({
      teamId,
      title,
      subtitle: finalSubtitle,
      content,
      createdBy,
    })

    await newAnnouncement.save()

    // Create notifications for team members about the new announcement
    try {
      const teamMembers = await UsersOfTeam.find({ teamId }, 'userId')
      const teamMemberUserIds = teamMembers.map((member) => member.userId)

      if (teamMemberUserIds.length > 0) {
        await createTeamAnnouncementCreatedNotification(
          teamId,
          newAnnouncement._id.toString(),
          title,
          createdBy,
          teamMemberUserIds,
        )
        console.log(`Notifications created for new announcement in team ${teamId}`)
      }
    } catch (notificationError) {
      console.error('Error creating announcement notifications:', notificationError)
      // Don't fail the announcement creation if notification creation fails
    }

    return res
      .status(201)
      .json({ message: 'Announcement added successfully', announcement: newAnnouncement })
  } catch (error) {
    console.error('Error adding announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteAnnouncement = async (req, res) => {
  // Delete an announcement by ID
  // Requires announcementId as a parameter
  await connectDB()
  try {
    const { announcementId } = req.params
    if (!announcementId) {
      return res.status(400).json({ message: 'Announcement ID is required' })
    }

    const announcement = await Announcements.findByIdAndDelete(announcementId)
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' })
    }
    return res.status(200).json({ message: 'Announcement deleted successfully' })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const updateAnnouncement = async (req, res) => {
  // Update an announcement by ID
  // Requires announcementId in the request body and at least one field to update
  await connectDB()
  try {
    const { id, title, subtitle, content, createdBy } = req.body
    const { teamId } = req.params
    console.log('Update announcement request:', { id, title, subtitle, content, createdBy, teamId })
    if (!teamId) {
      console.log('Team ID is required')
      return res.status(400).json({ message: 'Team ID is required' })
    }
    if (!title || !content || !createdBy || !id) {
      console.log('Missing required fields:', { id, title, content, createdBy })
      return res
        .status(400)
        .json({ message: 'Announcement ID and at least one field to update are required' })
    }
    if (subtitle == undefined || subtitle == null) {
      subtitle = ''
    }
    const announcement = await Announcements.findById(id)
    if (!announcement) {
      return res.status(404).json({ message: `Announcement not found with ID: ${id}` })
    }
    // Update the announcement fields
    announcement.title = title
    announcement.subtitle = subtitle
    announcement.content = content
    announcement.createdBy = createdBy
    announcement.updatedAt = new Date() // Update the updatedAt field
    // Save the updated announcement
    await announcement.save()
    return res.status(200).json({ message: 'Announcement updated successfully', announcement })
  } catch (error) {
    console.error('Error updating announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const toggleLikeAnnouncement = async (req, res) => {
  // Toggle like status of an announcement for a user
  // Requires announcementId and userId in the request body
  await connectDB()
  try {
    const { userId } = req.body
    const { announcementId } = req.params
    console.log('Toggle like announcement request:', { announcementId, userId })
    if (!announcementId || !userId) {
      console.log('Announcement ID and User ID are required')
      return res.status(400).json({ message: 'Announcement ID and User ID are required' })
    }

    const announcement = await Announcements.findById(announcementId)
    if (!announcement) {
      console.log(`Announcement not found with ID: ${announcementId}`)
      return res.status(404).json({ message: 'Announcement not found' })
    }

    const wasLiked = announcement.likeUsers.includes(userId)

    if (wasLiked) {
      // User already liked the announcement, remove like
      announcement.likeUsers = announcement.likeUsers.filter((user) => user !== userId)
      console.log(`User ${userId} unliked announcement ${announcementId}`)
    } else {
      // User has not liked the announcement, add like
      announcement.likeUsers.push(userId)
      console.log(`User ${userId} liked announcement ${announcementId}`)

      // Create notification for the announcement creator (only when liking, not unliking)
      try {
        await createAnnouncementLikedNotification(
          announcement.createdBy,
          announcementId,
          announcement.title,
          userId,
          announcement.teamId,
        )
        console.log(`Like notification created for announcement ${announcementId}`)
      } catch (notificationError) {
        console.error('Error creating like notification:', notificationError)
        // Don't fail the like operation if notification creation fails
      }
    }

    await announcement.save()
    return res.status(200).json({ message: 'Like status toggled successfully', announcement })
  } catch (error) {
    console.error('Error toggling like status:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addCommentToAnnouncement = async (req, res) => {
  // Add a comment to an announcement
  // Requires announcementId, userId, username, content, and replyTo (optional) in the request body
  await connectDB()
  try {
    const { announcementId } = req.params
    const { userId, username, content, replyTo } = req.body
    console.log('Add comment to announcement request:', {
      announcementId,
      userId,
      username,
      content,
      replyTo,
    })
    if (!announcementId || !userId || !username || !content) {
      console.log('Announcement ID, User ID, Username, and content are required')
      return res
        .status(400)
        .json({ message: 'Announcement ID, User ID, Username, and content are required' })
    }

    const announcement = await Announcements.findById(announcementId)
    if (!announcement) {
      console.log(`Announcement not found with ID: ${announcementId}`)
      return res.status(404).json({ message: 'Announcement not found' })
    }

    const newComment = {
      announcementId,
      username,
      content,
      replyTo: replyTo || '',
    }

    announcement.comments.push(newComment)
    await announcement.save()

    // Get the newly created comment with its generated _id
    const savedComment = announcement.comments[announcement.comments.length - 1]

    // Create notifications based on comment type
    try {
      if (replyTo) {
        // This is a reply to another comment - find the original commenter
        const parentComment = announcement.comments.find(
          (comment) => comment._id.toString() === replyTo,
        )

        if (parentComment) {
          // Find the userId of the parent comment's author by username
          // Note: This is a limitation of the current schema - we should store userId with comments
          const Account = await import('../models/Account.js').then((m) => m.default)
          const parentCommenter = await Account.findOne({ username: parentComment.username }, '_id')

          if (parentCommenter) {
            await createCommentRepliedNotification(
              parentCommenter._id.toString(),
              announcementId,
              announcement.title,
              userId,
              savedComment._id.toString(),
              replyTo,
              announcement.teamId,
            )
            console.log(`Reply notification created for comment ${replyTo}`)
          }
        }
      } else {
        // This is a comment on the announcement - notify the announcement creator
        await createAnnouncementCommentedNotification(
          announcement.createdBy,
          announcementId,
          announcement.title,
          userId,
          savedComment._id.toString(),
          announcement.teamId,
        )
        console.log(`Comment notification created for announcement ${announcementId}`)
      }
    } catch (notificationError) {
      console.error('Error creating comment notification:', notificationError)
      // Don't fail the comment creation if notification creation fails
    }

    return res.status(201).json({ message: 'Comment added successfully', comment: savedComment })
  } catch (error) {
    console.error('Error adding comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  getAnnouncementsOfTeam,
  addAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  toggleLikeAnnouncement,
  addCommentToAnnouncement,
}
