import mongoose from 'mongoose';


const RatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  issue: {
    type: String,
    enum: ['bug', 'feature', 'performance', 'ui', 'other'],
    required: true
  },
  featureRating: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  perfRating: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  uiRating: {
    type: Number,
    min: 1,
    max: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Rating =  mongoose.model('Rating', RatingSchema);
export default Rating
