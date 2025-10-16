import { fetchJSON } from '../scripts/apiClient.js'

export const AVAILABLE_PERMISSIONS = [
  // Basic permissions
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
    key: 'canSubmitTasks',
    label: 'Submit Tasks',
    category: 'Basic',
    description: 'Can submit task assignments',
  },

  // Task management permissions
  {
    key: 'canManageTasks',
    label: 'Manage Tasks',
    category: 'Tasks',
    description: 'Can create, edit, and manage tasks',
  },
  {
    key: 'canDeleteTasks',
    label: 'Delete Tasks',
    category: 'Tasks',
    description: 'Can delete tasks',
  },

  // Announcement management permissions
  {
    key: 'canManageAnnouncements',
    label: 'Manage Announcements',
    category: 'Announcements',
    description: 'Can create, edit, and manage announcements',
  },
  {
    key: 'canDeleteAnnouncements',
    label: 'Delete Announcements',
    category: 'Announcements',
    description: 'Can delete announcements',
  },

  // Member management permissions
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

  // Admin-only permissions
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
    this.userActions = {} // Store computed actions from backend
    this.isGlobalAdmin = false
    this.roleType = 'member'
    this.baseRole = 'Member'
    this.roleLabel = 'Member'
    this.customRoleName = null
  }

  /**
   * Set user actions from backend API response
   * Backend computes all permissions and sends only allowed actions
   * @param {Object} actions - User actions object from backend
   */
  setUserActions(actions) {
    this.userActions = actions || {}
    this.isGlobalAdmin = actions?.isGlobalAdmin || false
    this.roleType = actions?.roleType || actions?.role?.toLowerCase?.() || 'member'
    this.baseRole = actions?.baseRole || (this.roleType === 'admin' ? 'Admin' : 'Member')
    this.roleLabel = actions?.roleLabel || this.baseRole
    this.role = this.roleLabel // Backward compatibility for legacy accesses
    this.customRoleName = actions?.customRoleName || null
  }

  // Direct action checks - Backend is the source of truth
  canViewTeam() {
    return this.userActions.canViewTeam || false
  }
  canViewTasks() {
    return this.userActions.canViewTasks || false
  }
  canViewAnnouncements() {
    return this.userActions.canViewAnnouncements || false
  }
  canViewMembers() {
    return this.userActions.canViewMembers || false
  }

  canSubmitTasks() {
    return this.userActions.canSubmitTasks || false
  }

  canManageTasks() {
    return this.userActions.canManageTasks || false
  }
  canDeleteTasks() {
    return this.userActions.canDeleteTasks || false
  }

  canManageAnnouncements() {
    return this.userActions.canManageAnnouncements || false
  }
  canDeleteAnnouncements() {
    return this.userActions.canDeleteAnnouncements || false
  }

  canAddMembers() {
    return this.userActions.canAddMembers || false
  }
  canRemoveMembers() {
    return this.userActions.canRemoveMembers || false
  }

  canDeleteTeams() {
    return this.userActions.canDeleteTeams || false
  }
  canCreateSubTeams() {
    return this.userActions.canCreateSubTeams || false
  }
  canManageCustomRoles() {
    return this.userActions.canManageCustomRoles || false
  }

  /**
   * Check if user has any permission to access Task Group (manage, delete)
   */
  canViewTaskGroup() {
    return this.canManageTasks() || this.canDeleteTasks()
  }

  /**
   * Get user's role
   */
  getRole() {
    return this.roleLabel
  }

  /**
   * Get user's custom role name if any
   */
  getCustomRoleName() {
    return this.customRoleName
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.isGlobalAdmin || this.roleType === 'admin'
  }

  /**
   * Backwards compatibility - check if user has a specific action
   * @param {string} action - Action key to check
   * @returns {boolean} - Whether user can perform action
   */
  hasPermission(action) {
    return this.userActions[action] || false
  }

  /**
   * Get available permissions for custom roles (excluding admin-only and basic permissions)
   */
  getAvailablePermissionsForCustomRoles() {
    return AVAILABLE_PERMISSIONS.filter(
      (permission) => permission.category !== 'Admin Only' && permission.category !== 'Basic',
    )
  }

  /**
   * Get permissions grouped by category
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
   * Fetch user actions from backend API
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User actions
   */
  async fetchUserActions(teamId, userId) {
    try {
      const PORT = import.meta.env.VITE_API_PORT
      const { ok, status, data } = await fetchJSON(
        `${PORT}/api/teams/${teamId}/members/${userId}/permissions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (ok) {
        this.setUserActions(data)
        return data
      } else {
        console.log('Failed to fetch user actions:', data?.message || `Status ${status}`)
        return {}
      }
    } catch (error) {
      console.log('Error fetching user actions:', error)
      return {}
    }
  }

  /**
   * Update user permissions (admin only action)
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {Object} customPermissions - Custom permissions to update
   * @returns {Promise<boolean>} - Success status
   */
  async updateUserPermissions(teamId, userId, customPermissions) {
    try {
      const PORT = import.meta.env.VITE_API_PORT
      const { ok, status, data } = await fetchJSON(
        `${PORT}/api/teams/${teamId}/members/${userId}/permissions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customPermissions }),
        },
      )

      if (ok) {
        console.log('User permissions updated successfully')
        return true
      } else {
        console.log('Failed to update user permissions:', data?.message || `Status ${status}`)
        return false
      }
    } catch (error) {
      console.log('Error updating user permissions:', error)
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
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'mdi-crown'
      case 'member':
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
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'red'
      case 'member':
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

export default permissionService
