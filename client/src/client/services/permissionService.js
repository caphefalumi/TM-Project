/**
 * Centralized Permission Service
 * Manages permission checks and user authorization throughout the application
 */

// Permission constants matching backend config
export const PERMISSIONS = {
  // View permissions
  VIEW_TEAM: 'canViewTeam',
  VIEW_TASKS: 'canViewTasks',
  VIEW_ANNOUNCEMENTS: 'canViewAnnouncements',
  VIEW_MEMBERS: 'canViewMembers',
  VIEW_TASK_GROUPS: 'canViewTaskGroups',

  // Task permissions
  SUBMIT_TASKS: 'canSubmitTasks',
  MANAGE_TASKS: 'canManageTasks',
  DELETE_TASKS: 'canDeleteTasks',
  ASSIGN_TASKS: 'canAssignTasks',

  // Announcement permissions
  MANAGE_ANNOUNCEMENTS: 'canManageAnnouncements',
  DELETE_ANNOUNCEMENTS: 'canDeleteAnnouncements',

  // Member management permissions
  ADD_MEMBERS: 'canAddMembers',
  REMOVE_MEMBERS: 'canRemoveMembers',

  // Advanced management permissions
  DELETE_TEAMS: 'canDeleteTeams',
  CREATE_SUB_TEAMS: 'canCreateSubTeams',
  MANAGE_CUSTOM_ROLES: 'canManageCustomRoles',
}

export const AVAILABLE_PERMISSIONS = [
  // View permissions - basic permissions all users should have
  {
    key: 'canViewTeam',
    label: 'View Team',
    category: 'Basic',
    description: 'Can view team details',
  },
  {
    key: 'canViewTasks',
    label: 'View Tasks',
    category: 'Basic',
    description: 'Can view team tasks',
  },
  {
    key: 'canViewAnnouncements',
    label: 'View Announcements',
    category: 'Basic',
    description: 'Can view team announcements',
  },
  {
    key: 'canViewMembers',
    label: 'View Members',
    category: 'Basic',
    description: 'Can view team member list',
  },
  {
    key: 'canViewTaskGroups',
    label: 'View Task Groups',
    category: 'Basic',
    description: 'Can view task groups',
  },
  {
    key: 'canSubmitTasks',
    label: 'Submit Tasks',
    category: 'Basic',
    description: 'Can submit task assignments',
  },

  // Tasks group permissions
  {
    key: 'canManageTasks',
    label: 'Create and Edit Tasks',
    category: 'Tasks',
    description: 'Can create and edit tasks',
  },
  {
    key: 'canDeleteTasks',
    label: 'Delete Tasks',
    category: 'Tasks',
    description: 'Can delete tasks',
  },
  {
    key: 'canAssignTasks',
    label: 'Assign Tasks',
    category: 'Tasks',
    description: 'Can assign tasks to members',
  },

  // Announcements group permissions
  {
    key: 'canManageAnnouncements',
    label: 'Create and Edit Announcements',
    category: 'Announcements',
    description: 'Can create and edit announcements',
  },
  {
    key: 'canDeleteAnnouncements',
    label: 'Delete Announcements',
    category: 'Announcements',
    description: 'Can delete announcements',
  },

  // Members group permissions
  {
    key: 'canAddMembers',
    label: 'Add Members',
    category: 'Members',
    description: 'Can add new members to the team',
  },
  {
    key: 'canRemoveMembers',
    label: 'Remove Members',
    category: 'Members',
    description: 'Can remove members from the team',
  },

  // Admin-only privileges (cannot be assigned to custom roles)
  {
    key: 'canDeleteTeams',
    label: 'Delete Teams',
    category: 'Admin Only',
    description: 'Can delete the entire team (Admin privilege only)',
  },
  {
    key: 'canCreateSubTeams',
    label: 'Create Sub-teams',
    category: 'Admin Only',
    description: 'Can create sub-teams (Admin privilege only)',
  },
  {
    key: 'canManageCustomRoles',
    label: 'Manage Custom Roles',
    category: 'Admin Only',
    description: 'Can create and manage custom roles (Admin privilege only)',
  },
]

class PermissionService {
  constructor() {
    this.userPermissions = {}
    this.isGlobalAdmin = false
  }

  /**
   * Set user permissions from API response
   * @param {Object} permissions - User permission object
   */
  setPermissions(permissions) {
    this.userPermissions = permissions || {}
    this.isGlobalAdmin = permissions?.isGlobalAdmin || false
  }

  /**
   * Check if user has a specific permission
   * @param {string} permission - Permission key to check
   * @returns {boolean} - Whether user has permission
   */
  hasPermission(permission) {
    // Global admin has all permissions
    if (this.isGlobalAdmin) {
      return true
    }

    return this.userPermissions[permission] || false
  }

  /**
   * Check if user has any of the provided permissions
   * @param {string[]} permissions - Array of permission keys
   * @returns {boolean} - Whether user has any permission
   */
  hasAnyPermission(permissions) {
    return permissions.some((permission) => this.hasPermission(permission))
  }

  /**
   * Check if user has all of the provided permissions
   * @param {string[]} permissions - Array of permission keys
   * @returns {boolean} - Whether user has all permissions
   */
  hasAllPermissions(permissions) {
    return permissions.every((permission) => this.hasPermission(permission))
  }

  /**
   * Get user's role
   * @returns {string} - User's role
   */
  getRole() {
    return this.userPermissions.role || 'Member'
  }

  /**
   * Get user's custom role name if any
   * @returns {string|null} - Custom role name or null
   */
  getCustomRoleName() {
    return this.userPermissions.customRoleName || null
  }

  /**
   * Check if user is admin
   * @returns {boolean} - Whether user is admin
   */
  isAdmin() {
    return this.isGlobalAdmin || this.getRole() === 'Admin'
  }

  /**
   * Check if user can access announcements feature
   * @returns {boolean} - Whether user can see announcements in UI
   */
  canAccessAnnouncements() {
    return this.hasAnyPermission([
      'canManageAnnouncements',
      'canDeleteAnnouncements'
    ]) || this.isAdmin()
  }

  /**
   * Check if user can access tasks feature
   * @returns {boolean} - Whether user can see tasks management in UI
   */
  canAccessTasks() {
    return this.hasAnyPermission([
      'canManageTasks',
      'canDeleteTasks'
    ]) || this.isAdmin()
  }

  /**
   * Check if user can access members feature
   * @returns {boolean} - Whether user can see member management in UI
   */
  canAccessMembers() {
    return this.hasAnyPermission([
      'canAddMembers',
      'canRemoveMembers'
    ]) || this.isAdmin()
  }

  /**
   * Check if user can add members to team
   * @returns {boolean} - Whether user can add members
   */
  canAddTeamMembers() {
    return this.isAdmin()
  }

  /**
   * Check if user can customize roles when adding members
   * @returns {boolean} - Whether user can assign custom roles
   */
  canCustomizeRolesForNewMembers() {
    return this.isAdmin()
  }

  /**
   * Get available permissions for custom roles (excluding admin-only and basic permissions)
   * @returns {Array} - Array of permissions that can be assigned to custom roles
   */
  getAvailablePermissionsForCustomRoles() {
    return AVAILABLE_PERMISSIONS.filter(permission =>
      permission.category !== 'Admin Only' && permission.category !== 'Basic'
    )
  }

  /**
   * Get permissions grouped by category
   * @returns {Object} - Permissions grouped by category
   */
  getPermissionsByCategory() {
    const categorized = {}

    AVAILABLE_PERMISSIONS.forEach((permission) => {
      if (!categorized[permission.category]) {
        categorized[permission.category] = []
      }
      categorized[permission.category].push({
        ...permission,
        hasPermission: this.hasPermission(permission.key),
      })
    })

    return categorized
  }

  /**
   * Fetch user permissions from API
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User permissions
   */
  async fetchUserPermissions(teamId, userId) {
    try {
      const PORT = import.meta.env.VITE_API_PORT
      const response = await fetch(`${PORT}/api/teams/${teamId}/members/${userId}/permissions`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const permissions = await response.json()
        this.setPermissions(permissions)
        return permissions
      } else {
        console.error('Failed to fetch user permissions')
        return {}
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error)
      return {}
    }
  }

  /**
   * Update user permissions
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {Object} customPermissions - Custom permissions to update
   * @returns {Promise<boolean>} - Success status
   */
  async updateUserPermissions(teamId, userId, customPermissions) {
    try {
      const PORT = import.meta.env.VITE_API_PORT
      const response = await fetch(`${PORT}/api/teams/${teamId}/members/${userId}/permissions`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPermissions }),
      })

      return response.ok
    } catch (error) {
      console.error('Error updating user permissions:', error)
      return false
    }
  }

  /**
   * Get permission icon based on three-state value
   * @param {boolean|null} value - Permission value (true, false, null)
   * @returns {string} - MDI icon name
   */
  getPermissionIcon(value) {
    if (value === null) {
      return 'mdi-minus' // Default/indeterminate state
    } else if (value === true) {
      return 'mdi-check' // Enabled
    } else {
      return 'mdi-close' // Disabled
    }
  }

  /**
   * Get permission color based on three-state value
   * @param {boolean|null} value - Permission value (true, false, null)
   * @returns {string} - Color name
   */
  getPermissionColor(value) {
    if (value === null) {
      return 'grey' // Default/indeterminate state
    } else if (value === true) {
      return 'success' // Enabled - green
    } else {
      return 'error' // Disabled - red
    }
  }

  /**
   * Get role icon
   * @param {string} role - Role name
   * @returns {string} - MDI icon name
   */
  getRoleIcon(role) {
    switch (role) {
      case 'Admin':
        return 'mdi-crown'
      case 'Member':
        return 'mdi-account'
      default:
        return 'mdi-help'
    }
  }

  /**
   * Get role color
   * @param {string} role - Role name
   * @returns {string} - Color name
   */
  getRoleColor(role) {
    switch (role) {
      case 'Admin':
        return 'red'
      case 'Member':
        return 'blue'
      default:
        return 'grey'
    }
  }

  /**
   * Check if member has custom permissions
   * @param {Object} member - Member object
   * @returns {boolean} - Whether member has custom permissions
   */
  hasCustomPermissions(member) {
    if (!member.customPermissions) return false
    return Object.values(member.customPermissions).some((value) => value !== null)
  }
}

// Export singleton instance
export const permissionService = new PermissionService()

// Export common permission check composables for Vue components
export const usePermissions = () => {
  return {
    hasPermission: (permission) => permissionService.hasPermission(permission),
    hasAnyPermission: (permissions) => permissionService.hasAnyPermission(permissions),
    hasAllPermissions: (permissions) => permissionService.hasAllPermissions(permissions),
    isAdmin: () => permissionService.isAdmin(),
    getRole: () => permissionService.getRole(),
    getCustomRoleName: () => permissionService.getCustomRoleName(),
    getRoleIcon: (role) => permissionService.getRoleIcon(role),
    getRoleColor: (role) => permissionService.getRoleColor(role),
    hasCustomPermissions: (member) => permissionService.hasCustomPermissions(member),
    canAccessAnnouncements: () => permissionService.canAccessAnnouncements(),
    canAccessTasks: () => permissionService.canAccessTasks(),
    canAccessMembers: () => permissionService.canAccessMembers(),
    canAddTeamMembers: () => permissionService.canAddTeamMembers(),
    canCustomizeRolesForNewMembers: () => permissionService.canCustomizeRolesForNewMembers(),
    getAvailablePermissionsForCustomRoles: () => permissionService.getAvailablePermissionsForCustomRoles(),
  }
}

export default permissionService
