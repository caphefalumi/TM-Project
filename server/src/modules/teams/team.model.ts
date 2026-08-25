import mongoose from 'mongoose'

const teamsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Development',
      'Design',
      'Marketing',
      'Sales',
      'Support',
      'Operations',
      'Finance',
      'Human Resources',
      'Legal',
      'Product Management',
      'Data Science',
      'Research and Development',
      'Other',
    ],
  },
  description: {
    type: String,
    required: true,
  },
  // Only the admin of the parent team can create sub-teams.
  parentTeamId: {
    type: String,
    default: () => 'none',
    validate: {
      validator: function (value) {
        // Allow "none" only if it's the default value (i.e., not set explicitly)
        if (value === 'none') {
          // If the field is not modified (i.e., using default), it's valid
          return !this.isModified('parentTeamId')
        }
        // Otherwise, any string except "none" is valid
        return value !== 'none'
      },
      message: 'parentTeamId cannot be set to "none" explicitly.',
    },
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
    immutable: true, // Prevent modification after creation
  },
})

const Teams = mongoose.model('Teams', teamsSchema)
export default Teams
