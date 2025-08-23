import mongoose from 'mongoose'
import { ssrExportAllKey } from 'vite/module-runner'

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
  joinedAt: {
    type: Date,
    default: () => new Date(),
  },
})

const UsersOfTeam = mongoose.model('UsersOfTeam', UsersOfTeamSchema)
export default UsersOfTeam
