import SecurityEvent from '../models/SecurityEvent.js'
import Account from '../models/Account.js'
import { createNotification } from './notificationsService.js'
import Mailer from './mailer.js'

const ADMIN_USERNAME = 'admin'

async function notifyAdminUsers({ title, message, relatedData = {} }) {
  const admins = await Account.find({ username: ADMIN_USERNAME })
  for (const admin of admins) {
    await createNotification({
      recipientUserId: admin._id.toString(),
      type: 'admin',
      title,
      message,
      relatedData,
    })
  }

  if (process.env.SECURITY_ALERT_EMAIL) {
    try {
      await Mailer.sendSecurityAlert(
        process.env.SECURITY_ALERT_EMAIL,
        title,
        `${message}\n${JSON.stringify(relatedData, null, 2)}`,
      )
    } catch (error) {
      console.error('Failed to send security alert email:', error)
    }
  }
}

export async function recordSecurityEvent({
  userId,
  type,
  severity = 'low',
  description,
  metadata = {},
  notifyUser = true,
  notifyAdmins = false,
}) {
  const event = new SecurityEvent({
    userId,
    type,
    severity,
    description,
    metadata,
  })
  await event.save()

  const notificationTitle = 'Security Alert'

  if (notifyUser && userId) {
    await createNotification({
      recipientUserId: userId.toString(),
      type: 'security_alert',
      title: notificationTitle,
      message: description,
      relatedData: Object.fromEntries(Object.entries(metadata)),
    })
  }

  if (notifyAdmins) {
    await notifyAdminUsers({
      title: `${notificationTitle}: ${severity.toUpperCase()} event`,
      message: description,
      relatedData: Object.fromEntries(Object.entries(metadata)),
    })
  }

  return event
}

export default { recordSecurityEvent }
