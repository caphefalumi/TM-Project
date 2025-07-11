import mongoose from 'mongoose'

const AnnoucementSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    required: true,
  },
  likeUsers: {
    type: [String],
    default: () => [],
  },
  createdBy: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
})

const Announcement = mongoose.model('Announcement', AnnoucementSchema)
export default Announcement