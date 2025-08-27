// Centralized permissions configuration that matches the frontend
export const PERMISSIONS = {
  // View permissions
  VIEW_TEAM: 'canViewTeam',
  VIEW_TASKS: 'canViewTasks',
  VIEW_ANNOUNCEMENTS: 'canViewAnnouncements',
  VIEW_MEMBERS: 'canViewMembers',
  VIEW_TASK_GROUPS: 'canViewTaskGroups',
  
  // Task permissions
  SUBMIT_TASKS: 'canSubmitTasks',
  CREATE_TASK_GROUPS: 'canCreateTaskGroups',
  EDIT_TASK_GROUPS: 'canEditTaskGroups',
  DELETE_TASK_GROUPS: 'canDeleteTaskGroups',
  ASSIGN_TASKS: 'canAssignTasks',
  
  // Announcement permissions
  EDIT_ANNOUNCEMENTS: 'canEditAnnouncements',
  DELETE_ANNOUNCEMENTS: 'canDeleteAnnouncements',
  
  // Member management permissions
  ADD_MEMBERS: 'canAddMembers',
  REMOVE_MEMBERS: 'canRemoveMembers',
  CHANGE_MEMBER_ROLES: 'canChangeRoles',
  
  // Advanced management permissions
  DELETE_TEAMS: 'canDeleteTeams',
  CREATE_SUB_TEAMS: 'canCreateSubTeams',
  MANAGE_CUSTOM_ROLES: 'canManageCustomRoles',
}

export const DEFAULT_ROLE_PERMISSIONS = {
  Admin: [
    'canViewTeam', 'canViewTasks', 'canViewAnnouncements', 'canViewMembers', 'canViewTaskGroups',
    'canSubmitTasks', 'canCreateTaskGroups', 'canEditTaskGroups', 'canDeleteTaskGroups', 'canAssignTasks',
    'canEditAnnouncements', 'canDeleteAnnouncements',
    'canAddMembers', 'canRemoveMembers', 'canChangeRoles',
    'canDeleteTeams', 'canCreateSubTeams', 'canManageCustomRoles'
  ],
  Moderator: [
    'canViewTeam', 'canViewTasks', 'canViewAnnouncements', 'canViewMembers', 'canViewTaskGroups',
    'canSubmitTasks', 'canCreateTaskGroups', 'canEditTaskGroups', 'canAssignTasks',
    'canEditAnnouncements'
  ],
  Member: [
    'canViewTeam', 'canViewTasks', 'canViewAnnouncements', 'canViewMembers',
    'canSubmitTasks'
  ]
}

// Permission mapping for backward compatibility with existing API endpoints
export const PERMISSION_MAPPING = {
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

export const AVAILABLE_PERMISSIONS = [
  { key: 'canViewTeam', label: 'View Team', category: 'View', description: 'Can view team details and members' },
  { key: 'canViewTasks', label: 'View Tasks', category: 'View', description: 'Can view team tasks' },
  { key: 'canViewAnnouncements', label: 'View Announcements', category: 'View', description: 'Can view team announcements' },
  { key: 'canViewMembers', label: 'View Members', category: 'View', description: 'Can view team member list' },
  { key: 'canViewTaskGroups', label: 'View Task Groups', category: 'View', description: 'Can view task groups' },
  
  { key: 'canSubmitTasks', label: 'Submit Tasks', category: 'Tasks', description: 'Can submit task assignments' },
  { key: 'canCreateTaskGroups', label: 'Create Task Groups', category: 'Tasks', description: 'Can create new task groups' },
  { key: 'canEditTaskGroups', label: 'Edit Task Groups', category: 'Tasks', description: 'Can modify existing task groups' },
  { key: 'canDeleteTaskGroups', label: 'Delete Task Groups', category: 'Tasks', description: 'Can delete task groups' },
  { key: 'canAssignTasks', label: 'Assign Tasks', category: 'Tasks', description: 'Can assign tasks to members' },
  
  { key: 'canEditAnnouncements', label: 'Edit Announcements', category: 'Announcements', description: 'Can create, edit and delete announcements' },
  { key: 'canDeleteAnnouncements', label: 'Delete Announcements', category: 'Announcements', description: 'Can delete announcements' },
  
  { key: 'canAddMembers', label: 'Add Members', category: 'Members', description: 'Can add new members to the team' },
  { key: 'canRemoveMembers', label: 'Remove Members', category: 'Members', description: 'Can remove members from the team' },
  { key: 'canChangeRoles', label: 'Change Roles', category: 'Members', description: 'Can change member roles and permissions' },
  
  { key: 'canDeleteTeams', label: 'Delete Teams', category: 'Management', description: 'Can delete the entire team' },
  { key: 'canCreateSubTeams', label: 'Create Sub-teams', category: 'Management', description: 'Can create sub-teams' },
  { key: 'canManageCustomRoles', label: 'Manage Custom Roles', category: 'Management', description: 'Can create and manage custom roles' },
]

export default {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MAPPING,
  AVAILABLE_PERMISSIONS
}
