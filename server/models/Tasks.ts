import mongoose from 'mongoose'

const fieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['Short text', 'Long text', 'Number', 'Date', 'Select', 'URLs', 'Image', 'Phone'],
  },
  // Additional configuration for specific field types
  config: {
    // For 'select' type: options array
    options: {
      type: [String],
      required: function () {
        return this.type === 'Select'
      },
    },
    // For 'number' type: min and max values
    min: {
      type: Number,
      required: function () {
        return this.type === 'Number'
      },
    },
    max: {
      type: Number,
      required: function () {
        return this.type === 'Number'
      },
    },
    // For validation purposes
    required: {
      type: Boolean,
      default: false,
    },
  },
})

// Schema for dynamic field submissions
const submissionFieldSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Short text', 'Long text', 'Number', 'Date', 'Select', 'URLs', 'Image', 'Phone'],
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // Can be String, Number, Date, or Array
      required: true,
    },
  },
  { _id: false },
)

// Schema for task submissions
const taskSubmissionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    ref: 'Teams',
    required: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tasks',
    required: true,
  },
  submissionData: {
    type: [submissionFieldSchema],
    required: true,
    validate: {
      validator: function (fields) {
        return fields && fields.length > 0
      },
      message: 'At least one field must be submitted',
    },
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
})

const designSchema = new mongoose.Schema({
  numberOfFields: {
    type: Number,
    required: true,
    validate: {
      // equal or greater than 1
      validator: (v) => v >= 1,
      message: 'Number of fields must be at least 1',
    },
  },
  fields: {
    type: [fieldSchema],
    required: true,
    validate: {
      validator: function (fields) {
        return fields && fields.length === this.numberOfFields
      },
      message: 'Number of fields must match numberOfFields',
    },
  },
})

const taskSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    ref: 'Teams',
    required: true,
  },
  taskGroupId: {
    type: String,
    required: true,
  },
  design: {
    type: designSchema,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    // category of task, e.g., "development", "design", "marketing"
    type: String,
    required: true,
    enum: ['Report', 'Development', 'Design', 'Marketing', 'Other'],
  },
  tags: {
    type: [String],
    default: () => [],
  },
  description: {
    type: String,
    default: () => '',
  },
  priority: {
    // urgent, high, medium, low, optional
    type: String,
    required: true,
    enum: ['Urgent', 'High', 'Medium', 'Low', 'Optional'],
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  weighted: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    // If admin wants to create weekly tasks,
    // the admin will be asked the range of days to apply weekly tasks. (max 3 months)
    // Those task will be dynamically generated.
    type: Date,
    required: true,
  },
  // Track submissions for this task
  submissions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskSubmissions',
    },
  ],
  // Task submission status
  submitted: {
    type: Boolean,
    default: false,
  },
  // Jira-like features
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'],
    default: 'To Do',
  },
  assignee: {
    type: String,
    default: null,
  },
  reporter: {
    type: String,
    default: null,
  },
  estimatedHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  loggedHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  dependencies: {
    blockedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tasks',
      },
    ],
    blocking: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tasks',
      },
    ],
  },
  sprintId: {
    type: String,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
})

// Create models
const Tasks = mongoose.model('Tasks', taskSchema)
const TaskSubmissions = mongoose.model('TaskSubmissions', taskSubmissionSchema)

export { Tasks, TaskSubmissions }
export default Tasks
