import Account from '../auth/account.model.js'
import Announcements from '../announcements/announcement.model.js'
import { createNotification } from '../notifications/notifications.service.js'
import Teams from '../teams/team.model.js'
import UsersOfTeam from '../teams/team-membership.model.js'
import Tasks, { TaskSubmissions } from '../tasks/task.model.js'

export type AdminServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): AdminServiceResult => ({
  status,
  body,
})

export const getParentsTeam = async (parentTeamId: any) => {
  if (parentTeamId === 'none' || parentTeamId === null || !parentTeamId) {
    return ''
  }

  let teamBreadCrumps = ''
  let parentTeam = await Teams.findOne({ _id: parentTeamId })
  while (parentTeam) {
    teamBreadCrumps = parentTeam.title + ' > ' + teamBreadCrumps
    parentTeamId = parentTeam.parentTeamId
    if (parentTeamId === 'none') {
      break
    }
    const nextParentTeam = await Teams.findOne({ _id: parentTeam.parentTeamId })
    if (!nextParentTeam) {
      break
    }
    parentTeam = nextParentTeam
  }
  console.log('Team Bread Crumps:', teamBreadCrumps.trim())
  return teamBreadCrumps.trim()
}

export const getAllTeamsForAdmin = async (): Promise<AdminServiceResult> => {
  const teams = await Teams.find({}).sort({ createdAt: -1 })
  const teamsWithStatsAndBreadcrumbs = await Promise.all(
    teams.map(async (team) => {
      const memberCount = await UsersOfTeam.countDocuments({ teamId: team._id })
      const taskCount = await Tasks.countDocuments({ teamId: team._id })
      const fullBreadcrumbs = await getParentsTeam(team.parentTeamId)
      return {
        _id: team._id,
        name: team.title,
        title: team.title,
        description: team.description,
        category: team.category,
        parentTeamId: team.parentTeamId,
        createdAt: team.createdAt,
        memberCount,
        taskCount,
        fullBreadcrumbs,
      }
    }),
  )
  return result(200, { teams: teamsWithStatsAndBreadcrumbs })
}

export const getAllUsersForAdmin = async (): Promise<AdminServiceResult> => {
  const users = await Account.find(
    {},
    { userId: 1, username: 1, email: 1, createdAt: 1 },
  ).sort({ createdAt: -1 })
  return result(200, { users })
}

export const getAllAnnouncementsForAdmin = async (): Promise<AdminServiceResult> => {
  const announcementsWithInfo = await Announcements.aggregate([
    {
      $lookup: {
        from: 'teams',
        localField: 'teamId',
        foreignField: '_id',
        as: 'team',
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'author',
      },
    },
    {
      $project: {
        title: 1,
        subtitle: 1,
        content: 1,
        createdBy: 1,
        createdByUsername: {
          $cond: {
            if: { $gt: [{ $size: '$author' }, 0] },
            then: { $arrayElemAt: ['$author.username', 0] },
            else: '$createdByUsername',
          },
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ])
  return result(200, { announcements: announcementsWithInfo })
}

export const deleteTeamAsAdmin = async (teamId: string): Promise<AdminServiceResult> => {
  const tasks = await Tasks.find({ teamId })
  const taskIds = tasks.map((task) => task._id)
  if (taskIds.length > 0) {
    await TaskSubmissions.deleteMany({ taskId: { $in: taskIds } })
  }
  await Tasks.deleteMany({ teamId })
  await Announcements.deleteMany({ teamId })
  await UsersOfTeam.deleteMany({ teamId })
  await Teams.findByIdAndDelete(teamId)
  return result(200, { message: 'Team and all associated data deleted successfully' })
}

export const deleteUserAsAdmin = async (userId: string): Promise<AdminServiceResult> => {
  const user = await Account.findOne({ userId })
  if (user && user.username === 'admin') {
    return result(403, { message: 'Cannot delete admin user' })
  }

  await TaskSubmissions.deleteMany({ userId })
  await Tasks.deleteMany({ userId })
  await Announcements.deleteMany({ authorId: userId })
  await UsersOfTeam.deleteMany({ userId })
  await Account.findOneAndDelete({ _id: userId })
  return result(200, { message: 'User and all associated data deleted successfully' })
}

export const deleteAnnouncementAsAdmin = async (
  announcementId: string,
): Promise<AdminServiceResult> => {
  const deleteResult = await Announcements.findByIdAndDelete(announcementId)
  if (!deleteResult) {
    return result(404, { message: 'Announcement not found' })
  }
  return result(200, { message: 'Announcement deleted successfully' })
}

export const sendNotificationToUser = async (body: any): Promise<AdminServiceResult> => {
  const { userId, message, type = 'admin' } = body
  if (!userId || !message) {
    console.log('User ID and message are required:', { userId, message })
    return result(400, { message: 'User ID and message are required' })
  }

  await createNotification({
    recipientUserId: userId,
    type,
    title: 'Admin Message',
    message,
    relatedData: { source: 'admin_panel' },
  })
  return result(200, { message: 'Notification sent successfully' })
}

export default {
  getParentsTeam,
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAllAnnouncementsForAdmin,
  deleteTeamAsAdmin,
  deleteUserAsAdmin,
  deleteAnnouncementAsAdmin,
  sendNotificationToUser,
}
