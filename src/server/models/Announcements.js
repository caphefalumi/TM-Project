import mongoose from 'mongoose'

const announcementCommentsSchema = new mongoose.Schema({
  announcementId: {
    type: String,
    required: true,
  },
  replyTo: {
    // ID of the comment being replied to, null if it's a top-level comment
    type: String,
    default: null, // Can be null if it's a top-level comment
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
})

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
  comments: {
    type: [announcementCommentsSchema],
    default: () => [],
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdByUsername: {
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
