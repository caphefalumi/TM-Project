// Centralized permissions configuration shared by the entire application
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

// Membership permissions that every role builds upon
export const MEMBERSHIP_PERMISSIONS = {
  VIEW_TEAM: PERMISSIONS.VIEW_TEAM,
  VIEW_TASKS: PERMISSIONS.VIEW_TASKS,
  VIEW_ANNOUNCEMENTS: PERMISSIONS.VIEW_ANNOUNCEMENTS,
  VIEW_MEMBERS: PERMISSIONS.VIEW_MEMBERS,
  VIEW_TASK_GROUPS: PERMISSIONS.VIEW_TASK_GROUPS,
  SUBMIT_TASKS: PERMISSIONS.SUBMIT_TASKS,
}

// Permissions that allow management-level capabilities (non-admin)
export const MANAGEMENT_PERMISSIONS = [
  PERMISSIONS.MANAGE_TASKS,
  PERMISSIONS.DELETE_TASKS,
  PERMISSIONS.ASSIGN_TASKS,
  PERMISSIONS.MANAGE_ANNOUNCEMENTS,
  PERMISSIONS.DELETE_ANNOUNCEMENTS,
  PERMISSIONS.ADD_MEMBERS,
  PERMISSIONS.REMOVE_MEMBERS,
]

// Permissions that are restricted to administrators only
export const ADMIN_ONLY_PERMISSIONS = [
  PERMISSIONS.DELETE_TEAMS,
  PERMISSIONS.CREATE_SUB_TEAMS,
  PERMISSIONS.MANAGE_CUSTOM_ROLES,
]

// Define role-based default permissions
export const ROLE_PERMISSIONS = {
  Admin: [
    ...Object.values(MEMBERSHIP_PERMISSIONS),
    ...MANAGEMENT_PERMISSIONS,
    ...ADMIN_ONLY_PERMISSIONS,
  ],
  Member: [...Object.values(MEMBERSHIP_PERMISSIONS)],
}
