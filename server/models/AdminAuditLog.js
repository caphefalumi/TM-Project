import mongoose from 'mongoose'

const adminAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
  },
  targetUserId: {
    type: String,
    default: null,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
})

const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema)
export default AdminAuditLog
