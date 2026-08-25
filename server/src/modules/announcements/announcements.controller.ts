import * as announcementsService from './announcements.service.js'

const sendResult = async (
  res: any,
  operation: Promise<announcementsService.AnnouncementServiceResult>,
) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const getAnnouncementsOfTeam = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      announcementsService.getAnnouncementsOfTeam(req.params.teamId),
    )
  } catch (error) {
    console.log('Error fetching announcements:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const addAnnouncement = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      announcementsService.addAnnouncement(req.params.teamId, req.body),
    )
  } catch (error) {
    console.log('Error adding announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteAnnouncement = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      announcementsService.deleteAnnouncement(req.params.announcementId),
    )
  } catch (error) {
    console.log('Error deleting announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateAnnouncement = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      announcementsService.updateAnnouncement(req.params.teamId, req.body),
    )
  } catch (error) {
    console.log('Error updating announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const toggleLikeAnnouncement = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      announcementsService.toggleLikeAnnouncement(
        req.params.announcementId,
        req.body.userId,
      ),
    )
  } catch (error) {
    console.log('Error toggling like status:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const addCommentToAnnouncement = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      announcementsService.addCommentToAnnouncement(req.params.announcementId, req.body),
    )
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
