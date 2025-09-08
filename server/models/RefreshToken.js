import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  // Login activity tracking
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: 'Unknown',
  },
  device: {
    type: String,
    default: 'Unknown',
  },
  browser: {
    type: String,
    default: 'Unknown',
  },
  // Activity tracking
  lastActivity: {
    type: Date,
    default: () => Date.now(),
  },
  activityCount: {
    type: Number,
    default: 1,
  },
  // Token lifecycle
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  revokedReason: {
    type: String,
    enum: ['refresh_session', 'user_logout', 'security', 'expired', 'admin', 'suspicious_activity'],
    default: null,
  },
})

const RefreshToken = mongoose.model('Sessions', refreshTokenSchema)
export default RefreshToken
