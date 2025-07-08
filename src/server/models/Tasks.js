import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: () => '',
  },
  category: {
    // category of task, e.g., "development", "design", "marketing"
    type: String,
    required: true,
    enum: ['Report', 'Development', 'Design', 'Marketing', 'Other'],
  },
  priority: {
    // urgent, high, medium, low, optional
    type: String,
    required: true,
    enum: ['urgent', 'high', 'medium', 'low', 'optional'],
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  weighted: {
    type: Number,
    required: true,
  },
  dueDate: {
    // If admin wants to create weekly tasks,
    // the admin will be asked the range of days to apply weekly tasks. (max 3 months)
    // Those task will be dynamically generated.
    type: Date,
    required: true,
  },
  submitted: {
    type: Boolean,
    default: () => false,
  },
})

const Tasks = mongoose.model('Tasks', taskSchema)
export default Tasks