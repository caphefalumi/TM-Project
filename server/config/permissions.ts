// Centralized permissions configuration - Single Source of Truth
export const PERMISSIONS = {
  // Basic view permissions
  VIEW_TEAM: 'canViewTeam',
  VIEW_TASKS: 'canViewTasks',
  VIEW_ANNOUNCEMENTS: 'canViewAnnouncements',
  VIEW_MEMBERS: 'canViewMembers',

  // Basic action permissions
  SUBMIT_TASKS: 'canSubmitTasks',

  // Task management permissions
  MANAGE_TASKS: 'canManageTasks',
  DELETE_TASKS: 'canDeleteTasks',

  // Announcement management permissions
  MANAGE_ANNOUNCEMENTS: 'canManageAnnouncements',
  DELETE_ANNOUNCEMENTS: 'canDeleteAnnouncements',

  // Member management permissions
  ADD_MEMBERS: 'canAddMembers',
  REMOVE_MEMBERS: 'canRemoveMembers',

  // Admin-only permissions
  DELETE_TEAMS: 'canDeleteTeams',
  CREATE_SUB_TEAMS: 'canCreateSubTeams',
  MANAGE_CUSTOM_ROLES: 'canManageCustomRoles',
}

// Role → Permission mapping (Single Source of Truth)
export const ROLE_PERMISSIONS = {
  Admin: Object.values(PERMISSIONS), // Admins get all permissions
  Member: [
    // Basic permissions for members
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.SUBMIT_TASKS,
  ],
}

// Computed UI actions based on permissions
export const computeUserActions = (userPermissions) => {
  return {
    // Basic permissions - always true for all team members
    canViewTeam: true,
    canViewTasks: true,
    canViewAnnouncements: true,
    canViewMembers: true,
    canSubmitTasks: true,

    // Advanced permissions - based on role and custom permissions
    canManageTasks: userPermissions[PERMISSIONS.MANAGE_TASKS] || false,
    canDeleteTasks: userPermissions[PERMISSIONS.DELETE_TASKS] || false,

    // Announcement actions
    canManageAnnouncements: userPermissions[PERMISSIONS.MANAGE_ANNOUNCEMENTS] || false,
    canDeleteAnnouncements: userPermissions[PERMISSIONS.DELETE_ANNOUNCEMENTS] || false,

    // Member actions
    canAddMembers: userPermissions[PERMISSIONS.ADD_MEMBERS] || false,
    canRemoveMembers: userPermissions[PERMISSIONS.REMOVE_MEMBERS] || false,

    // Admin actions
    canDeleteTeams: userPermissions[PERMISSIONS.DELETE_TEAMS] || false,
    canCreateSubTeams: userPermissions[PERMISSIONS.CREATE_SUB_TEAMS] || false,
    canManageCustomRoles: userPermissions[PERMISSIONS.MANAGE_CUSTOM_ROLES] || false,
  }
}
