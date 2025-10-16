import mongoose from 'mongoose'

const UsersOfTeamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teams',
    required: true,
  },
  roleType: {
    type: String,
    enum: ['admin', 'member', 'custom'],
    required: true,
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: function () {
      return this.roleType === 'custom'
    },
  },
  joinedAt: {
    type: Date,
    default: () => new Date(),
  },
})

UsersOfTeamSchema.index({ userId: 1, teamId: 1 }, { unique: true })

const UsersOfTeam = mongoose.model('UsersOfTeam', UsersOfTeamSchema)
export default UsersOfTeam
