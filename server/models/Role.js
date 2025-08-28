import mongoose from 'mongoose'

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teams',
    required: true,
  },
  permissions: {
    type: [String],
    default: [],
    enum: [
      // View permissions
      'canViewTeam',
      'canViewTasks',
      'canViewAnnouncements',
      'canViewMembers',
      'canViewTaskGroups',

      // Task permissions
      'canSubmitTasks',
      'canCreateTaskGroups',
      'canEditTaskGroups',
      'canDeleteTaskGroups',
      'canAssignTasks',

      // Announcement permissions
      'canEditAnnouncements',
      'canDeleteAnnouncements',

      // Member management permissions
      'canAddMembers',
      'canRemoveMembers',
      'canChangeRoles',

      // Advanced management permissions
      'canDeleteTeams',
      'canCreateSubTeams',
      'canManageCustomRoles',
    ],
  },
  icon: {
    type: String,
    default: 'mdi-star',
    trim: true,
  },
  color: {
    type: String,
    default: 'purple',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
})

// Update the updatedAt field before saving
RoleSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

// Create compound index for team_id and name to ensure unique role names per team
RoleSchema.index({ team_id: 1, name: 1 }, { unique: true })

const Role = mongoose.model('Role', RoleSchema)
export default Role
