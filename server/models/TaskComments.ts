import mongoose from 'mongoose'

const taskCommentSchema = new mongoose.Schema({
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
  comment: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
  edited: {
    type: Boolean,
    default: false,
  },
})

const TaskComments = mongoose.model('TaskComments', taskCommentSchema)
export default TaskComments
