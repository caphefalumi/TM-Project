import mongoose from 'mongoose'

const loginAttemptSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  username: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastAttemptAt: {
    type: Date,
    default: () => Date.now(),
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  requireCaptchaUntil: {
    type: Date,
    default: null,
  },
})

loginAttemptSchema.index({ lastAttemptAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 })

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema)
export default LoginAttempt
