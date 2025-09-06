import mongoose from 'mongoose'
import { randomBytes } from 'crypto'

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => randomBytes(32).toString('hex')
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  revokedReason: {
    type: String,
    enum: ['logout', 'timeout', 'security', 'admin', 'duplicate'],
    default: null,
  }
})

// Index for efficient queries
sessionSchema.index({ sessionId: 1 })
sessionSchema.index({ userId: 1, isActive: 1 })
sessionSchema.index({ expiresAt: 1 })

// Clean up expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const Session = mongoose.model('Session', sessionSchema)
export default Session
