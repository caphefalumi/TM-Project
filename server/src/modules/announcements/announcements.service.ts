import {
  createAnnouncementCommentedNotification,
  createAnnouncementLikedNotification,
  createCommentRepliedNotification,
  createTeamAnnouncementCreatedNotification,
} from '../notifications/notifications.service.js'
import Teams from '../teams/team.model.js'
import UsersOfTeam from '../teams/team-membership.model.js'
import Announcements from './announcement.model.js'

export type AnnouncementServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): AnnouncementServiceResult => ({
  status,
  body,
})

export const getAnnouncementsOfTeam = async (
  teamId: string,
): Promise<AnnouncementServiceResult> => {
  if (!teamId) {
    return result(400, { message: 'Team ID is required' })
  }

  const teamExists = await Teams.exists({ _id: teamId })
  if (!teamExists) {
    return result(404, { message: 'Team not found' })
  }

  const announcements = await Announcements.find({ teamId }).sort({ updatedAt: -1 })
  if (announcements.length === 0) {
    return result(200, { announcements: [] })
  }
  return result(200, { announcements })
}

export const addAnnouncement = async (
  teamId: string,
  body: any,
): Promise<AnnouncementServiceResult> => {
  const { title, subtitle, content, createdBy, createdByUsername } = body
  if (!teamId || !title || !content || !createdBy || !createdByUsername) {
    return result(400, { message: 'All fields are required' })
  }

  const finalSubtitle = subtitle == undefined || subtitle == null ? '' : subtitle
  const teamExists = await Teams.exists({ _id: teamId })
  if (!teamExists) {
    return result(404, { message: 'Team not found' })
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

  try {
    const teamMembers = await UsersOfTeam.find({ teamId }, 'userId')
    const teamMemberUserIds = teamMembers.map((member) => member.userId.toString())
    if (teamMemberUserIds.length > 0) {
      await createTeamAnnouncementCreatedNotification(
        teamId,
        newAnnouncement._id.toString(),
        title,
        createdBy,
        teamMemberUserIds,
      )
    }
  } catch (notificationError) {
    console.log('Error creating announcement notifications:', notificationError)
  }

  return result(201, {
    message: 'Announcement added successfully',
    announcement: newAnnouncement,
  })
}

export const deleteAnnouncement = async (
  announcementId: string,
): Promise<AnnouncementServiceResult> => {
  if (!announcementId) {
    return result(400, { message: 'Announcement ID is required' })
  }

  const announcement = await Announcements.findByIdAndDelete(announcementId)
  if (!announcement) {
    return result(404, { message: 'Announcement not found' })
  }
  return result(200, { message: 'Announcement deleted successfully' })
}

export const updateAnnouncement = async (
  teamId: string,
  body: any,
): Promise<AnnouncementServiceResult> => {
  let { id, title, subtitle, content, createdBy, createdByUsername } = body
  if (!teamId) {
    console.log('Team ID is required')
    return result(400, { message: 'Team ID is required' })
  }
  if (!title || !content || !createdBy || !createdByUsername || !id) {
    console.log('Missing required fields:', { id, title, content, createdBy, createdByUsername })
    return result(400, { message: 'Announcement ID and all fields are required' })
  }
  if (subtitle == undefined || subtitle == null) {
    subtitle = ''
  }

  const announcement = await Announcements.findById(id)
  if (!announcement) {
    return result(404, { message: `Announcement not found with ID: ${id}` })
  }

  announcement.title = title
  announcement.subtitle = subtitle
  announcement.content = content
  announcement.createdBy = createdBy
  announcement.createdByUsername = createdByUsername
  announcement.updatedAt = new Date()
  await announcement.save()

  return result(200, { message: 'Announcement updated successfully', announcement })
}

export const toggleLikeAnnouncement = async (
  announcementId: string,
  userId: string,
): Promise<AnnouncementServiceResult> => {
  if (!announcementId || !userId) {
    console.log('Announcement ID and User ID are required')
    return result(400, { message: 'Announcement ID and User ID are required' })
  }

  const announcement = await Announcements.findById(announcementId)
  if (!announcement) {
    console.log(`Announcement not found with ID: ${announcementId}`)
    return result(404, { message: 'Announcement not found' })
  }

  const wasLiked = announcement.likeUsers.includes(userId)
  if (wasLiked) {
    announcement.likeUsers = announcement.likeUsers.filter((user) => user !== userId)
  } else {
    announcement.likeUsers.push(userId)
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
    }
  }

  await announcement.save()
  return result(200, { message: 'Like status toggled successfully', announcement })
}

export const addCommentToAnnouncement = async (
  announcementId: string,
  body: any,
): Promise<AnnouncementServiceResult> => {
  const { userId, username, content, replyTo } = body
  if (!announcementId || !userId || !username || !content) {
    console.log('Announcement ID, User ID, Username, and content are required')
    return result(400, {
      message: 'Announcement ID, User ID, Username, and content are required',
    })
  }

  const announcement = await Announcements.findById(announcementId)
  if (!announcement) {
    console.log(`Announcement not found with ID: ${announcementId}`)
    return result(404, { message: 'Announcement not found' })
  }

  announcement.comments.push({
    announcementId,
    userId,
    username,
    content,
    replyTo: replyTo || '',
  })
  await announcement.save()

  const savedComment = announcement.comments[announcement.comments.length - 1]
  try {
    if (replyTo) {
      const parentComment = announcement.comments.find(
        (comment) => comment._id.toString() === replyTo,
      )
      if (parentComment && parentComment.userId) {
        await createCommentRepliedNotification(
          parentComment.userId,
          announcementId,
          announcement.title,
          userId,
          savedComment._id.toString(),
          replyTo,
          announcement.teamId,
        )
      }
    } else {
      await createAnnouncementCommentedNotification(
        announcement.createdBy,
        announcementId,
        announcement.title,
        userId,
        savedComment._id.toString(),
        announcement.teamId,
      )
    }
  } catch (notificationError) {
    console.log('Error creating comment notification:', notificationError)
  }

  return result(201, { message: 'Comment added successfully', comment: savedComment })
}

export default {
  getAnnouncementsOfTeam,
  addAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  toggleLikeAnnouncement,
  addCommentToAnnouncement,
}
