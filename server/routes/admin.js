import Account from '../models/Account.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'
import Announcements from '../models/Announcements.js'
import { createNotification } from '../scripts/notificationsService.js'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import AdminAuditLog from '../models/AdminAuditLog.js'
import MonitoringService from '../scripts/monitoringService.js'

// Admin middleware to check if user is admin
const checkAdminAccess = (req, res, next) => {
  // Check if the authenticated user is admin
  if (req.user && req.user.username === 'admin') {
    next()
  } else {
    return res.status(403).json({
      message: 'Access denied. Admin privileges required.',
    })
  }
}

const recordAdminAudit = async (req, action, targetUserId = null, metadata = {}) => {
  if (!req.user?.userId) {
    return
  }

  const auditLog = new AdminAuditLog({
    adminId: req.user.userId,
    action,
    targetUserId,
    metadata,
  })

  await auditLog.save()
}

// Recursive function to get parent team breadcrumbs
const getParentsTeam = async (parentTeamId) => {
  if (parentTeamId === 'none' || parentTeamId === null || !parentTeamId) {
    return ''
  } else {
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
}

const getAllTeamsForAdmin = async (req, res) => {
  try {
    // Get all teams with member count and task count
    const teams = await Teams.find({}).sort({ createdAt: -1 })

    const teamsWithStatsAndBreadcrumbs = await Promise.all(
      teams.map(async (team) => {
        // Get member count
        const memberCount = await UsersOfTeam.countDocuments({ teamId: team._id })

        // Get task count
        const taskCount = await Tasks.countDocuments({ teamId: team._id })

        // Get breadcrumbs
        const fullBreadcrumbs = await getParentsTeam(team.parentTeamId)

        return {
          _id: team._id,
          name: team.title, // Use title as name for consistency
          title: team.title,
          description: team.description,
          category: team.category,
          parentTeamId: team.parentTeamId,
          createdAt: team.createdAt,
          memberCount,
          taskCount,
          fullBreadcrumbs, // Include full breadcrumbs
        }
      }),
    )

    return res.status(200).json({
      teams: teamsWithStatsAndBreadcrumbs,
    })
  } catch (error) {
    console.error('Error fetching teams for admin:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getAllUsersForAdmin = async (req, res) => {
  try {
    // Get all users with just username and email
    const users = await Account.find(
      {},
      {
        userId: 1,
        username: 1,
        email: 1,
        createdAt: 1,
      },
    ).sort({ createdAt: -1 })

    return res.status(200).json({
      users: users,
    })
  } catch (error) {
    console.error('Error fetching users for admin:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getAllAnnouncementsForAdmin = async (req, res) => {
  try {
    // Get all announcements with team and author info
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
          subtitle: 1, // Include subtitle field
          content: 1,
          createdBy: 1,
          createdByUsername: {
            $cond: {
              if: { $gt: [{ $size: '$author' }, 0] },
              then: { $arrayElemAt: ['$author.username', 0] },
              else: '$createdByUsername', // Fallback to existing field if lookup fails
            },
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ])

    return res.status(200).json({
      announcements: announcementsWithInfo,
    })
  } catch (error) {
    console.error('Error fetching announcements for admin:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteTeamAsAdmin = async (req, res) => {
  try {
    const { teamId } = req.params

    // Delete all tasks and task submissions for this team
    const tasks = await Tasks.find({ teamId })
    const taskIds = tasks.map((task) => task._id)

    if (taskIds.length > 0) {
      await TaskSubmissions.deleteMany({ taskId: { $in: taskIds } })
    }
    await Tasks.deleteMany({ teamId })

    // Delete all announcements for this team
    await Announcements.deleteMany({ teamId })

    // Delete all user memberships for this team
    await UsersOfTeam.deleteMany({ teamId })

    // Delete the team itself
    await Teams.findByIdAndDelete(teamId)

    return res.status(200).json({
      message: 'Team and all associated data deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting team:', error)
    return res.status(500).json({ message: 'Failed to delete team' })
  }
}

const deleteUserAsAdmin = async (req, res) => {
  try {
    const { userId } = req.params

    // Don't allow deletion of admin user
    const user = await Account.findOne({ userId })
    if (user && user.username === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' })
    }

    // Delete all task submissions by this user
    await TaskSubmissions.deleteMany({ userId })

    // Delete all tasks assigned to this user
    await Tasks.deleteMany({ userId })

    // Delete all announcements created by this user
    await Announcements.deleteMany({ authorId: userId })

    // Remove user from all teams
    await UsersOfTeam.deleteMany({ userId })

    // Delete the user account
    await Account.findOneAndDelete({ _id: userId })

    return res.status(200).json({
      message: 'User and all associated data deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({ message: 'Failed to delete user' })
  }
}

const deleteAnnouncementAsAdmin = async (req, res) => {
  try {
    const { announcementId } = req.params

    const result = await Announcements.findByIdAndDelete(announcementId)

    if (!result) {
      return res.status(404).json({ message: 'Announcement not found' })
    }

    return res.status(200).json({
      message: 'Announcement deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return res.status(500).json({ message: 'Failed to delete announcement' })
  }
}

const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, message, type = 'admin' } = req.body

    if (!userId || !message) {
      console.log('User ID and message are required:', { userId, message })
      return res.status(400).json({ message: 'User ID and message are required' })
    }

    // Create notification
    await createNotification({
      recipientUserId: userId, // Fix parameter name
      type,
      title: 'Admin Message',
      message,
      relatedData: {
        source: 'admin_panel',
      },
    })

    return res.status(200).json({
      message: 'Notification sent successfully',
    })
  } catch (error) {
    console.log('Error sending notification:', error)
    return res.status(500).json({ message: 'Failed to send notification' })
  }
}

const getUserSessionsForAdmin = async (req, res) => {
  try {
    const { userId } = req.params
    const stats = await RefreshTokenManager.getUserTokenStats(userId)
    await recordAdminAudit(req, 'view_user_sessions', userId, { sessionCount: stats.activeSessionCount })

    return res.status(200).json({
      success: true,
      sessions: stats.sessions,
      summary: {
        activeTokens: stats.activeTokenCount,
        uniqueIPs: stats.uniqueIPs,
        totalActivity: stats.totalActivity,
      },
    })
  } catch (error) {
    console.error('Error fetching user sessions for admin:', error)
    return res.status(500).json({ message: 'Failed to fetch user sessions' })
  }
}

const revokeSessionAsAdmin = async (req, res) => {
  try {
    const { sessionId } = req.params
    const result = await RefreshTokenManager.revokeSession(sessionId, 'admin')

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Session not found or already revoked' })
    }

    await recordAdminAudit(req, 'revoke_session', null, { sessionId, revokedCount: result.modifiedCount })
    await MonitoringService.triggerAlert({
      title: 'admin_session_revoke',
      message: `Admin revoked session ${sessionId}`,
      metadata: { sessionId, adminId: req.user.userId },
    })

    return res.status(200).json({
      message: 'Session revoked successfully',
      revokedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Error revoking session as admin:', error)
    return res.status(500).json({ message: 'Failed to revoke session' })
  }
}

const revokeAllSessionsForUser = async (req, res) => {
  try {
    const { userId } = req.params
    const result = await RefreshTokenManager.revokeAllUserTokens(userId, 'admin')

    await recordAdminAudit(req, 'revoke_all_sessions', userId, {
      revokedCount: result.modifiedCount,
    })

    await MonitoringService.triggerAlert({
      title: 'admin_mass_logout',
      message: `Admin revoked all sessions for user ${userId}`,
      metadata: { userId, revokedCount: result.modifiedCount },
    })

    return res.status(200).json({
      message: 'All user sessions revoked successfully',
      revokedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Error revoking all sessions for user:', error)
    return res.status(500).json({ message: 'Failed to revoke all sessions' })
  }
}

const getAdminAuditLogs = async (_req, res) => {
  try {
    const logs = await AdminAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return res.status(200).json({ logs })
  } catch (error) {
    console.error('Error fetching admin audit logs:', error)
    return res.status(500).json({ message: 'Failed to fetch admin audit logs' })
  }
}

export default {
  checkAdminAccess,
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAllAnnouncementsForAdmin,
  deleteTeamAsAdmin,
  deleteUserAsAdmin,
  deleteAnnouncementAsAdmin,
  sendNotificationToUser,
  getUserSessionsForAdmin,
  revokeSessionAsAdmin,
  revokeAllSessionsForUser,
  getAdminAuditLogs,
}
