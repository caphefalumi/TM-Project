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
      return res.status(200).json({ announcements: [] })
    }
    return res.status(200).json({ announcements })
  } catch (error) {
    console.log('Error fetching announcements:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addAnnouncement = async (req, res) => {
  // Add a new announcement to a team
  // Requires teamId, title, content, createdBy (userId), and createdByUsername in the request body

  try {
    let { title, subtitle, content, createdBy, createdByUsername } = req.body
    const { teamId } = req.params
    if (!teamId || !title || !content || !createdBy || !createdByUsername) {
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
      createdByUsername,
    })

    await newAnnouncement.save()

    // Create notifications for team members about the new announcement
    try {
      const teamMembers = await UsersOfTeam.find({ teamId }, 'userId')
      const teamMemberUserIds = teamMembers.map((member) => member.userId.toString())

      if (teamMemberUserIds.length > 0) {
        await createTeamAnnouncementCreatedNotification(
          teamId,
          newAnnouncement._id.toString(),
          title,
          createdBy, // Now this is the userId
          teamMemberUserIds,
        )
      }
    } catch (notificationError) {
      console.log('Error creating announcement notifications:', notificationError)
      // Don't fail the announcement creation if notification creation fails
    }

    return res
      .status(201)
      .json({ message: 'Announcement added successfully', announcement: newAnnouncement })
  } catch (error) {
    console.log('Error adding announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteAnnouncement = async (req, res) => {
  // Delete an announcement by ID
  // Requires announcementId as a parameter

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
    console.log('Error deleting announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const updateAnnouncement = async (req, res) => {
  // Update an announcement by ID
  // Requires announcementId in the request body and at least one field to update

  try {
    let { id, title, subtitle, content, createdBy, createdByUsername } = req.body
    const { teamId } = req.params
    if (!teamId) {
      console.log('Team ID is required')
      return res.status(400).json({ message: 'Team ID is required' })
    }
    if (!title || !content || !createdBy || !createdByUsername || !id) {
      console.log('Missing required fields:', { id, title, content, createdBy, createdByUsername })
      return res.status(400).json({ message: 'Announcement ID and all fields are required' })
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
    announcement.createdByUsername = createdByUsername
    announcement.updatedAt = new Date() // Update the updatedAt field
    // Save the updated announcement
    await announcement.save()
    return res.status(200).json({ message: 'Announcement updated successfully', announcement })
  } catch (error) {
    console.log('Error updating announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const toggleLikeAnnouncement = async (req, res) => {
  // Toggle like status of an announcement for a user
  // Requires announcementId and userId in the request body

  try {
    const { userId } = req.body
    const { announcementId } = req.params
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
    } else {
      // User has not liked the announcement, add like
      announcement.likeUsers.push(userId)

      // Create notification for the announcement creator (only when liking, not unliking)
      try {
        await createAnnouncementLikedNotification(
          announcement.createdBy,
          announcementId,
          announcement.title,
          userId,
          announcement.teamId,
        )
      } catch (notificationError) {
        console.log('Error creating like notification:', notificationError)
        // Don't fail the like operation if notification creation fails
      }
    }

    await announcement.save()
    return res.status(200).json({ message: 'Like status toggled successfully', announcement })
  } catch (error) {
    console.log('Error toggling like status:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addCommentToAnnouncement = async (req, res) => {
  // Add a comment to an announcement
  // Requires announcementId, userId, username, content, and replyTo (optional) in the request body

  try {
    const { announcementId } = req.params
    const { userId, username, content, replyTo } = req.body
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
      userId,
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

        if (parentComment && parentComment.userId) {
          await createCommentRepliedNotification(
            parentComment.userId, // Now we have the userId directly
            announcementId,
            announcement.title,
            userId,
            savedComment._id.toString(),
            replyTo,
            announcement.teamId,
          )
        }
      } else {
        // This is a comment on the announcement - notify the announcement creator
        await createAnnouncementCommentedNotification(
          announcement.createdBy, // This is now the userId
          announcementId,
          announcement.title,
          userId,
          savedComment._id.toString(),
          announcement.teamId,
        )
      }
    } catch (notificationError) {
      console.log('Error creating comment notification:', notificationError)
      // Don't fail the comment creation if notification creation fails
    }

    return res.status(201).json({ message: 'Comment added successfully', comment: savedComment })
  } catch (error) {
    console.log('Error adding comment:', error)
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
