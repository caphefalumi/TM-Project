import mongoose from 'mongoose'

const RatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  issue: {
    type: String,
    enum: ['Very bad', 'Bad', 'Average', 'Good', 'Excellent'],
    required: true,
  },
  featureRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  perfRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  uiRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Rating = mongoose.model('Rating', RatingSchema)
export default Rating
