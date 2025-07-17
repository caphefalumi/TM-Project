import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  // The user who will receive this notification
  recipientUserId: {
    type: String,
    required: true,
    index: true, // Index for efficient queries by recipient
  },

  // The user who triggered this notification (if applicable)
  actorUserId: {
    type: String,
    required: false, // Some notifications might be system-generated
  },

  // Type of notification
  type: {
    type: String,
    required: true,
    enum: [
      'team_member_added', // User added to team
      'announcement_liked', // Someone liked user's announcement
      'announcement_commented', // Someone commented on user's announcement
      'comment_replied', // Someone replied to user's comment
      'team_announcement_created', // New announcement in user's team
      'admin', // Admin notification
    ],
  },

  // Notification title (short description)
  title: {
    type: String,
    required: true,
  },

  // Detailed message content
  message: {
    type: String,
    required: true,
  },

  // Related data for the notification
  relatedData: {
    teamId: { type: String }, // Related team ID
    teamName: { type: String }, // Team name for display
    announcementId: { type: String }, // Related announcement ID
    announcementTitle: { type: String }, // Announcement title for display
    commentId: { type: String }, // Related comment ID
    parentCommentId: { type: String }, // Parent comment ID for replies
  },

  // Notification status
  isRead: {
    type: Boolean,
    default: false,
    index: true, // Index for efficient unread queries
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: () => Date.now(),
    index: true, // Index for sorting by date
  },

  readAt: {
    type: Date,
    default: null,
  },
})

// Compound indexes for efficient queries
notificationSchema.index({ recipientUserId: 1, createdAt: -1 })
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 })

// User notification preferences schema
const notificationPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  preferences: {
    team_member_added: {
      enabled: { type: Boolean, default: true },
    },
    announcement_liked: {
      enabled: { type: Boolean, default: true },
    },
    announcement_commented: {
      enabled: { type: Boolean, default: true },
    },
    comment_replied: {
      enabled: { type: Boolean, default: true },
    },
    team_announcement_created: {
      enabled: { type: Boolean, default: true },
    },
    admin: {
      enabled: { type: Boolean, default: true }, // Admin notifications are always enabled by default
    },
  },

  // Global settings
  globalSettings: {
    enableAllNotifications: { type: Boolean, default: true },
    maxNotificationsToKeep: { type: Number, default: 100 },
  },

  createdAt: {
    type: Date,
    default: () => Date.now(),
  },

  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
})

// Update the updatedAt field before saving
notificationPreferencesSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

const Notifications = mongoose.model('Notifications', notificationSchema)
const NotificationPreferences = mongoose.model(
  'NotificationPreferences',
  notificationPreferencesSchema,
)

export { Notifications, NotificationPreferences }
