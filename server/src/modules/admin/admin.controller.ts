import * as adminService from './admin.service.js'

const sendResult = async (res: any, operation: Promise<adminService.AdminServiceResult>) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const getAllTeamsForAdmin = async (_req: any, res: any) => {
  try {
    return await sendResult(res, adminService.getAllTeamsForAdmin())
  } catch (error) {
    console.log('Error fetching teams for admin:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getAllUsersForAdmin = async (_req: any, res: any) => {
  try {
    return await sendResult(res, adminService.getAllUsersForAdmin())
  } catch (error) {
    console.log('Error fetching users for admin:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getAllAnnouncementsForAdmin = async (_req: any, res: any) => {
  try {
    return await sendResult(res, adminService.getAllAnnouncementsForAdmin())
  } catch (error) {
    console.log('Error fetching announcements for admin:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteTeamAsAdmin = async (req: any, res: any) => {
  try {
    return await sendResult(res, adminService.deleteTeamAsAdmin(req.params.teamId))
  } catch (error) {
    console.log('Error deleting team:', error)
    return res.status(500).json({ message: 'Failed to delete team' })
  }
}

export const deleteUserAsAdmin = async (req: any, res: any) => {
  try {
    return await sendResult(res, adminService.deleteUserAsAdmin(req.params.userId))
  } catch (error) {
    console.log('Error deleting user:', error)
    return res.status(500).json({ message: 'Failed to delete user' })
  }
}

export const deleteAnnouncementAsAdmin = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      adminService.deleteAnnouncementAsAdmin(req.params.announcementId),
    )
  } catch (error) {
    console.log('Error deleting announcement:', error)
    return res.status(500).json({ message: 'Failed to delete announcement' })
  }
}

export const sendNotificationToUser = async (req: any, res: any) => {
  try {
    return await sendResult(res, adminService.sendNotificationToUser(req.body))
  } catch (error) {
    console.log('Error sending notification:', error)
    return res.status(500).json({ message: 'Failed to send notification' })
  }
}

export default {
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAllAnnouncementsForAdmin,
  deleteTeamAsAdmin,
  deleteUserAsAdmin,
  deleteAnnouncementAsAdmin,
  sendNotificationToUser,
}
