import mongoose from 'mongoose'

const UsersOfTeamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teams',
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: false,
  },
  customPermissions: {
    // Custom permissions that override default role permissions
    type: {
      // View permissions
      canViewTeam: { type: Boolean, default: null },
      canViewTasks: { type: Boolean, default: null },
      canViewAnnouncements: { type: Boolean, default: null },
      canViewMembers: { type: Boolean, default: null },
      canViewTaskGroups: { type: Boolean, default: null },

      // Task permissions
      canSubmitTasks: { type: Boolean, default: null },
      canManageTasks: { type: Boolean, default: null },
      canDeleteTasks: { type: Boolean, default: null },
      canAssignTasks: { type: Boolean, default: null },

      // Announcement permissions
      canManageAnnouncements: { type: Boolean, default: null },
      canDeleteAnnouncements: { type: Boolean, default: null },

      // Member management permissions
      canAddMembers: { type: Boolean, default: null },
      canRemoveMembers: { type: Boolean, default: null },

      // Advanced management permissions
      canDeleteTeams: { type: Boolean, default: null },
      canCreateSubTeams: { type: Boolean, default: null },
      canManageCustomRoles: { type: Boolean, default: null },
    },
    default: {},
  },
  joinedAt: {
    type: Date,
    default: () => new Date(),
  },
})

const UsersOfTeam = mongoose.model('UsersOfTeam', UsersOfTeamSchema)
export default UsersOfTeam
