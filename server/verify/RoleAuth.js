import UsersOfTeam from '../models/UsersOfTeam.js'

export const ROLES = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member'
}

export const PERMISSIONS = {
  VIEW_TEAM: ['Admin', 'Moderator', 'Member'],
  VIEW_TASKS: ['Admin', 'Moderator', 'Member'],
  VIEW_ANNOUNCEMENTS: ['Admin', 'Moderator', 'Member'],
  VIEW_MEMBERS: ['Admin', 'Moderator', 'Member'],
  SUBMIT_TASKS: ['Admin', 'Moderator', 'Member'],

  EDIT_ANNOUNCEMENTS: ['Admin', 'Moderator'],
  VIEW_TASK_GROUPS: ['Admin', 'Moderator'],
  CREATE_TASK_GROUPS: ['Admin', 'Moderator'],
  EDIT_TASK_GROUPS: ['Admin', 'Moderator'],

  ADD_MEMBERS: ['Admin'],
  REMOVE_MEMBERS: ['Admin'],
  DELETE_TEAMS: ['Admin'],
  CREATE_SUB_TEAMS: ['Admin'],
  CHANGE_MEMBER_ROLES: ['Admin'],

  GLOBAL_ADMIN_ACCESS: ['admin']
}

export const getUserCustomPermissions = async (userId, teamId) => {
  try {
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    if (!userTeamRole) {
      return null
    }

    const rolePermissions = getRoleDefaultPermissions(userTeamRole.role)
    // Convert Mongoose subdocument to plain object to avoid metadata
    const customPermissions = userTeamRole.customPermissions ? userTeamRole.customPermissions.toObject() : {}
    const effectivePermissions = { ...rolePermissions }

    Object.keys(customPermissions).forEach(permission => {
      if (customPermissions[permission] !== null && customPermissions[permission] !== undefined) {
        effectivePermissions[permission] = customPermissions[permission]
      }
    })

    return {
      role: userTeamRole.role,
      ...effectivePermissions,
      isGlobalAdmin: false
    }
  } catch (error) {
    console.error('Error getting user effective permissions:', error)
    return null
  }
}

export const getRoleDefaultPermissions = (role) => {
  const basePermissions = {
    canViewTeam: false,
    canViewTasks: false,
    canViewAnnouncements: false,
    canViewMembers: false,
    canSubmitTasks: false,
    canEditAnnouncements: false,
    canViewTaskGroups: false,
    canCreateTaskGroups: false,
    canEditTaskGroups: false,
    canAddMembers: false,
    canRemoveMembers: false,
    canDeleteTeams: false,
    canCreateSubTeams: false,
    canChangeRoles: false,
  }

  switch (role) {
    case 'Admin':
      return {
        ...basePermissions,
        canViewTeam: true,
        canViewTasks: true,
        canViewAnnouncements: true,
        canViewMembers: true,
        canSubmitTasks: true,
        canEditAnnouncements: true,
        canViewTaskGroups: true,
        canCreateTaskGroups: true,
        canEditTaskGroups: true,
        canAddMembers: true,
        canRemoveMembers: true,
        canDeleteTeams: true,
        canCreateSubTeams: true,
        canChangeRoles: true,
      }
    case 'Moderator':
      return {
        ...basePermissions,
        canViewTeam: true,
        canViewTasks: true,
        canViewAnnouncements: true,
        canViewMembers: true,
        canSubmitTasks: true,
        canEditAnnouncements: true,
        canViewTaskGroups: true,
        canCreateTaskGroups: true,
        canEditTaskGroups: true,
      }
    case 'Member':
      return {
        ...basePermissions,
        canViewTeam: true,
        canViewTasks: true,
        canViewAnnouncements: true,
        canViewMembers: true,
        canSubmitTasks: true,
      }
    default:
      return basePermissions
  }
}

export const hasPermission = async (userId, teamId, permission, globalUsername = null) => {
  try {
    if (globalUsername === 'admin' && PERMISSIONS.GLOBAL_ADMIN_ACCESS.includes('admin')) {
      return true
    }

    const customPermissions = await getUserCustomPermissions(userId, teamId)
    if (!customPermissions) {
      return false
    }

    const permissionMap = {
      'VIEW_TEAM': 'canViewTeam',
      'VIEW_TASKS': 'canViewTasks',
      'VIEW_ANNOUNCEMENTS': 'canViewAnnouncements',
      'VIEW_MEMBERS': 'canViewMembers',
      'SUBMIT_TASKS': 'canSubmitTasks',
      'EDIT_ANNOUNCEMENTS': 'canEditAnnouncements',
      'VIEW_TASK_GROUPS': 'canViewTaskGroups',
      'CREATE_TASK_GROUPS': 'canCreateTaskGroups',
      'EDIT_TASK_GROUPS': 'canEditTaskGroups',
      'ADD_MEMBERS': 'canAddMembers',
      'REMOVE_MEMBERS': 'canRemoveMembers',
      'DELETE_TEAMS': 'canDeleteTeams',
      'CREATE_SUB_TEAMS': 'canCreateSubTeams',
      'CHANGE_MEMBER_ROLES': 'canChangeRoles',
    }

    const permissionField = permissionMap[permission]
    if (!permissionField) {
      console.warn(`Unknown permission: ${permission}`)
      return false
    }

    return customPermissions[permissionField] || false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

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


export const getUserRoleInTeam = async (userId, teamId) => {
  try {
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    return userTeamRole ? userTeamRole.role : null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}


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
  hasElevatedPrivileges,
  getUserCustomPermissions,
  getRoleDefaultPermissions
}
