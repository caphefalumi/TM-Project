import mongoose from 'mongoose'

const sprintSchema = new mongoose.Schema({
  teamId: {
    type: String,
    ref: 'Teams',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  goal: {
    type: String,
    default: '',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed'],
    default: 'planned',
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  completedAt: {
    type: Date,
    default: null,
  },
})

const Sprint = mongoose.model('Sprint', sprintSchema)
export default Sprint
