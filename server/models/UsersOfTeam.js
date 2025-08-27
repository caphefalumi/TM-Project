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
    // admin, moderator, member
    type: String,
    required: true,
    enum: ['Admin', 'Moderator', 'Member'],
  },
  customPermissions: {
    // Custom permissions that override default role permissions
    type: {
      canViewTeam: { type: Boolean, default: null },
      canViewTasks: { type: Boolean, default: null },
      canViewAnnouncements: { type: Boolean, default: null },
      canViewMembers: { type: Boolean, default: null },
      canSubmitTasks: { type: Boolean, default: null },
      canEditAnnouncements: { type: Boolean, default: null },
      canViewTaskGroups: { type: Boolean, default: null },
      canCreateTaskGroups: { type: Boolean, default: null },
      canEditTaskGroups: { type: Boolean, default: null },
      canAddMembers: { type: Boolean, default: null },
      canRemoveMembers: { type: Boolean, default: null },
      canDeleteTeams: { type: Boolean, default: null },
      canCreateSubTeams: { type: Boolean, default: null },
      canChangeRoles: { type: Boolean, default: null },
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
