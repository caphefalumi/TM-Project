import UsersOfTeam from '../models/UsersOfTeam.js'
import { PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions.js'

export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  CUSTOM: 'custom',
}

const ROLE_TYPE_TO_BASE_ROLE = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MEMBER]: 'Member',
  [ROLES.CUSTOM]: 'Member',
}

export const getBaseRoleFromRoleType = (roleType) => {
  if (!roleType) {
    return 'Member'
  }
  return ROLE_TYPE_TO_BASE_ROLE[roleType] || 'Member'
}

export const getRoleLabel = (roleType, customRole) => {
  if (roleType === ROLES.CUSTOM && customRole) {
    return customRole.name
  }
  return getBaseRoleFromRoleType(roleType)
}

// Simplified permission constants - use centralized config for actual permissions
export const GLOBAL_ADMIN_ACCESS = ['admin']

export const getUserCustomPermissions = async (userId, teamId) => {
  try {
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId }).populate('roleId')
    if (!userTeamRole) {
      return null
    }

    // Start with default role permissions
    const baseRole = getBaseRoleFromRoleType(userTeamRole.roleType)
    let rolePermissions = getRoleDefaultPermissions(baseRole)

    // If user has a custom role assigned, add custom role permissions to base role permissions
    if (
      userTeamRole.roleType === ROLES.CUSTOM &&
      userTeamRole.roleId &&
      userTeamRole.roleId.permissions
    ) {
      // Start with base role permissions (Member gets basic permissions)
      const customRolePermissions = { ...rolePermissions }

      // Add the additional permissions defined in the custom role
      userTeamRole.roleId.permissions.forEach((permission) => {
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
      roleType: userTeamRole.roleType,
      baseRole,
      roleLabel: getRoleLabel(userTeamRole.roleType, userTeamRole.roleId),
      customRoleName: userTeamRole.roleId ? userTeamRole.roleId.name : null,
      customRoleColor: userTeamRole.roleId ? userTeamRole.roleId.color : null,
      ...effectivePermissions,
      isGlobalAdmin: false,
    }
  } catch (error) {
    console.log('Error getting user effective permissions:', error)
    return null
  }
}

export const getRoleDefaultPermissions = (roleIdentifier) => {
  const baseRole = ROLE_PERMISSIONS[roleIdentifier]
    ? roleIdentifier
    : getBaseRoleFromRoleType(roleIdentifier)

  // Use the centralized default permissions configuration
  const permissions = ROLE_PERMISSIONS[baseRole] || []

  // Convert to object format for easy access
  const permissionObject = {}

  // Get all available permissions from the ROLE_PERMISSIONS config
  const allPermissions = new Set()
  Object.values(ROLE_PERMISSIONS).forEach((rolePermissions) => {
    rolePermissions.forEach((permission) => allPermissions.add(permission))
  })

  // Initialize all available permissions to false
  Array.from(allPermissions).forEach((permission) => {
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
    if (globalUsername === 'admin') {
      return true
    }

    const customPermissions = await getUserCustomPermissions(userId, teamId)
    if (!customPermissions) {
      return false
    }

    const permissionField = PERMISSIONS[permission]
    if (!permissionField) {
      console.warn(`Unknown permission: ${permission}`)
      return false
    }

    return customPermissions[permissionField] || false
  } catch (error) {
    console.log('Error checking permission:', error)
    return false
  }
}

export const requireAdmin = (req, res, next) => {
  const userId = req.user?.userId
  const username = req.user?.username
  let teamId = req.params.teamId || req.body?.teamId

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  // Check if user is global admin first
  if (username === 'admin') {
    return next()
  }

  // Validate teamId - check for undefined, null, or the string "undefined"
  if (!teamId || teamId === 'undefined' || teamId === 'null') {
    return res.status(400).json({ message: 'Team ID is required' })
  }

  UsersOfTeam.findOne({ userId, teamId })
    .then((userTeam) => {
      if (!userTeam || userTeam.roleType !== ROLES.ADMIN) {
        return res.status(403).json({ message: 'Admin access required' })
      }
      next()
    })
    .catch((error) => {
      console.log('Error checking admin role:', error)
      return res.status(500).json({ message: 'Internal server error' })
    })
}

export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId
      let teamId = req.params.teamId || req.body?.teamId
      const globalUsername = req.user?.username

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      // Check if user is global admin first
      if (globalUsername === 'admin') {
        return next()
      }

      // Validate teamId - check for undefined, null, or the string "undefined"
      if (!teamId || teamId === 'undefined' || teamId === 'null') {
        return res.status(400).json({ message: 'Team ID is required' })
      }

      let allowed = false
      if (Array.isArray(permission)) {
        for (const perm of permission) {
          if (await hasPermission(userId, teamId, perm, globalUsername)) {
            allowed = true
            break
          }
        }
      } else {
        allowed = await hasPermission(userId, teamId, permission, globalUsername)
      }

      if (!allowed) {
        return res.status(403).json({
          message: 'Insufficient permissions for this action',
          requiredPermission: permission,
          userRole: await getUserRoleInTeam(userId, teamId),
        })
      }

      next()
    } catch (error) {
      console.log('Permission check error:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
}

export const getUserRoleInTeam = async (userId, teamId) => {
  try {
    // Validate inputs to prevent casting errors
    if (!userId || !teamId || teamId === 'undefined' || teamId === 'null') {
      return null
    }
    
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    return userTeamRole ? userTeamRole.roleType : null
  } catch (error) {
    console.log('Error getting user role:', error)
    return null
  }
}

export const hasElevatedPrivileges = async (userId) => {
  try {
    const roles = await UsersOfTeam.find({
      userId,
      roleType: { $in: [ROLES.ADMIN] },
    })
    return roles.length > 0
  } catch (error) {
    console.log('Error checking elevated privileges:', error)
    return false
  }
}

export default {
  ROLES,
  getBaseRoleFromRoleType,
  getRoleLabel,
  GLOBAL_ADMIN_ACCESS,
  hasPermission,
  requirePermission,
  getUserRoleInTeam,
  hasElevatedPrivileges,
  getUserCustomPermissions,
  getRoleDefaultPermissions,
}
