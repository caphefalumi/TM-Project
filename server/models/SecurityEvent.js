import mongoose from 'mongoose'

const securityEventSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true,
  },
  type: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  notified: {
    type: Boolean,
    default: false,
  },
  notifiedTargets: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
})

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema)
export default SecurityEvent
