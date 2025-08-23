import UsersOfTeam from '../models/UsersOfTeam.js'

/**
 * Role-based permissions definitions
 */
export const ROLES = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member'
}

export const PERMISSIONS = {
  // Member permissions (view-only)
  VIEW_TEAM: ['Admin', 'Moderator', 'Member'],
  VIEW_TASKS: ['Admin', 'Moderator', 'Member'],
  VIEW_ANNOUNCEMENTS: ['Admin', 'Moderator', 'Member'],
  VIEW_MEMBERS: ['Admin', 'Moderator', 'Member'],
  SUBMIT_TASKS: ['Admin', 'Moderator', 'Member'],

  // Moderator permissions
  EDIT_ANNOUNCEMENTS: ['Admin', 'Moderator'],
  VIEW_TASK_GROUPS: ['Admin', 'Moderator'],
  CREATE_TASK_GROUPS: ['Admin', 'Moderator'],
  EDIT_TASK_GROUPS: ['Admin', 'Moderator'],

  // Admin permissions
  ADD_MEMBERS: ['Admin'],
  REMOVE_MEMBERS: ['Admin'],
  DELETE_TEAMS: ['Admin'],
  CREATE_SUB_TEAMS: ['Admin'],
  CHANGE_MEMBER_ROLES: ['Admin'],

  // Global admin permissions (username = 'admin')
  GLOBAL_ADMIN_ACCESS: ['admin']
}

/**
 * Check if user has permission for a specific action in a team
 * @param {string} userId - User ID
 * @param {string} teamId - Team ID
 * @param {string} permission - Permission to check
 * @param {string} globalUsername - Username for global admin check
 * @returns {Promise<boolean>} - True if user has permission
 */
export const hasPermission = async (userId, teamId, permission, globalUsername = null) => {
  try {
    // Global admin check
    if (globalUsername === 'admin' && PERMISSIONS.GLOBAL_ADMIN_ACCESS.includes('admin')) {
      return true
    }

    // Get user's role in the team
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    if (!userTeamRole) {
      return false
    }

    // Check if user's role has the required permission
    return PERMISSIONS[permission]?.includes(userTeamRole.role) || false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Middleware to check if user has specific permission in a team
 * @param {string} permission - Permission to check
 * @returns {Function} Express middleware
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId
      const teamId = req.params.teamId || req.body.teamId
      const globalUsername = req.user?.username

      if (!userId) {
        console.log('User ID missing in request')
        return res.status(401).json({ message: 'Authentication required' })
      }

      if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required' })
      }

      const allowed = await hasPermission(userId, teamId, permission, globalUsername)

      if (!allowed) {
        return res.status(403).json({
          message: 'Insufficient permissions for this action',
          requiredPermission: permission,
          userRole: await getUserRoleInTeam(userId, teamId)
        })
      }

      next()
    } catch (error) {
      console.error('Permission check error:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
}

/**
 * Get user's role in a specific team
 * @param {string} userId - User ID
 * @param {string} teamId - Team ID
 * @returns {Promise<string|null>} - User's role or null if not found
 */
export const getUserRoleInTeam = async (userId, teamId) => {
  try {
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    return userTeamRole ? userTeamRole.role : null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

/**
 * Check if user is admin or moderator in any team
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user has admin/moderator privileges
 */
export const hasElevatedPrivileges = async (userId) => {
  try {
    const roles = await UsersOfTeam.find({
      userId,
      role: { $in: ['Admin', 'Moderator'] }
    })
    return roles.length > 0
  } catch (error) {
    console.error('Error checking elevated privileges:', error)
    return false
  }
}

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  requirePermission,
  getUserRoleInTeam,
  hasElevatedPrivileges
}
