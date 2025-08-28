import UsersOfTeam from '../models/UsersOfTeam.js'
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MAPPING } from '../config/permissions.js'

export const ROLES = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
}

// Simplified permission constants - use centralized config for actual permissions
export const GLOBAL_ADMIN_ACCESS = ['admin']

export const getUserCustomPermissions = async (userId, teamId) => {
  try {
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId }).populate('role_id')
    if (!userTeamRole) {
      return null
    }

    // Start with default role permissions
    let rolePermissions = getRoleDefaultPermissions(userTeamRole.role)

    // If user has a custom role assigned, override with custom role permissions
    if (userTeamRole.role_id && userTeamRole.role_id.permissions) {
      const customRolePermissions = {}

      // Set all permissions to false first
      Object.keys(rolePermissions).forEach((key) => {
        customRolePermissions[key] = false
      })

      // Enable only the permissions defined in the custom role
      userTeamRole.role_id.permissions.forEach((permission) => {
        customRolePermissions[permission] = true
      })

      rolePermissions = customRolePermissions
    }

    // Convert Mongoose subdocument to plain object to avoid metadata
    const customPermissions = userTeamRole.customPermissions
      ? userTeamRole.customPermissions.toObject()
      : {}
    const effectivePermissions = { ...rolePermissions }

    // Apply individual custom permissions that override both default and custom role permissions
    Object.keys(customPermissions).forEach((permission) => {
      if (customPermissions[permission] !== null && customPermissions[permission] !== undefined) {
        effectivePermissions[permission] = customPermissions[permission]
      }
    })

    return {
      role: userTeamRole.role,
      customRoleName: userTeamRole.role_id ? userTeamRole.role_id.name : null,
      ...effectivePermissions,
      isGlobalAdmin: false,
    }
  } catch (error) {
    console.error('Error getting user effective permissions:', error)
    return null
  }
}

export const getRoleDefaultPermissions = (role) => {
  // Use the centralized default permissions configuration
  const permissions = DEFAULT_ROLE_PERMISSIONS[role] || []

  // Convert to object format for easy access
  const permissionObject = {}

  // Initialize all permissions to false
  Object.values(PERMISSION_MAPPING).forEach((permission) => {
    permissionObject[permission] = false
  })

  // Set role-specific permissions to true
  permissions.forEach((permission) => {
    permissionObject[permission] = true
  })

  return permissionObject
}

export const hasPermission = async (userId, teamId, permission, globalUsername = null) => {
  try {
    if (globalUsername === 'admin' && GLOBAL_ADMIN_ACCESS.includes('admin')) {
      return true
    }

    const customPermissions = await getUserCustomPermissions(userId, teamId)
    if (!customPermissions) {
      return false
    }

    const permissionField = PERMISSION_MAPPING[permission]
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
          userRole: await getUserRoleInTeam(userId, teamId),
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
      role: { $in: ['Admin', 'Moderator'] },
    })
    return roles.length > 0
  } catch (error) {
    console.error('Error checking elevated privileges:', error)
    return false
  }
}

export default {
  ROLES,
  GLOBAL_ADMIN_ACCESS,
  hasPermission,
  requirePermission,
  getUserRoleInTeam,
  hasElevatedPrivileges,
  getUserCustomPermissions,
  getRoleDefaultPermissions,
}
