import mongoose from 'mongoose'

const taskActivitySchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tasks',
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'created',
      'updated',
      'status_changed',
      'comment_added',
      'assignee_changed',
      'priority_changed',
      'dependency_added',
      'dependency_removed',
      'time_logged',
      'sprint_changed',
    ],
  },
  field: {
    type: String,
    default: null,
  },
  oldValue: {
    type: String,
    default: null,
  },
  newValue: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
})

const TaskActivity = mongoose.model('TaskActivity', taskActivitySchema)
export default TaskActivity
