// Centralized permissions configuration
export const PERMISSIONS = {
  // Task permissions
  MANAGE_TASKS: 'canManageTasks',
  DELETE_TASKS: 'canDeleteTasks',

  // Announcement permissions
  MANAGE_ANNOUNCEMENTS: 'canManageAnnouncements',
  DELETE_ANNOUNCEMENTS: 'canDeleteAnnouncements',

  // Member management permissions
  ADD_MEMBERS: 'canAddMembers',
  REMOVE_MEMBERS: 'canRemoveMembers',
}

// Membership permissions (own dictionary)
export const MEMBERSHIP_PERMISSIONS = {
  VIEW_TEAM: 'canViewTeam',
  VIEW_TASKS: 'canViewTasks',
  VIEW_ANNOUNCEMENTS: 'canViewAnnouncements',
  VIEW_MEMBERS: 'canViewMembers',
  VIEW_TASK_GROUPS: 'canViewTaskGroups',
  SUBMIT_TASKS: 'canSubmitTasks',
}

// Define role-based default permissions
export const ROLE_PERMISSIONS = {
  Admin: [
    ...Object.values(MEMBERSHIP_PERMISSIONS),
    ...Object.values(PERMISSIONS),
    'canAssignTasks',
    'canDeleteTeams',
    'canCreateSubTeams',
    'canManageCustomRoles',
  ],
  Member: [...Object.values(MEMBERSHIP_PERMISSIONS)],
}
