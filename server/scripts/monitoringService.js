import SecurityEvent from '../models/SecurityEvent.js'

class MonitoringService {
  static async recordMetric(metric, value = 1) {
    if (process.env.NODE_ENV === 'test') {
      return
    }
    console.log(`[monitoring] ${metric}: ${value}`)
  }

  static async triggerAlert({ title, message, metadata = {} }) {
    console.warn(`[alert] ${title}: ${message}`, metadata)

    const event = new SecurityEvent({
      type: `monitoring:${title}`,
      severity: 'medium',
      description: message,
      metadata,
    })
    await event.save()
  }
}

export default MonitoringService
