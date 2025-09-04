// Centralized permissions configuration that matches the frontend
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

// Define role-based default permissions
export const ROLE_PERMISSIONS = {
  Admin: [
    'canViewTeam',
    'canViewTasks', 
    'canViewAnnouncements',
    'canViewMembers',
    'canViewTaskGroups',
    'canSubmitTasks',
    'canManageTasks',
    'canDeleteTasks',
    'canAssignTasks',
    'canManageAnnouncements',
    'canDeleteAnnouncements',
    'canAddMembers',
    'canRemoveMembers',
    'canDeleteTeams',
    'canCreateSubTeams',
    'canManageCustomRoles'
  ],
  Member: [
    'canViewTeam',
    'canViewTasks',
    'canViewAnnouncements', 
    'canViewMembers',
    'canViewTaskGroups',
    'canSubmitTasks'
  ]
}
