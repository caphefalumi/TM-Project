import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '../../src/stores/notifications.ts'
import { useGlobalNotifications } from '../../src/composables/useGlobalNotifications.ts'

describe('notification integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds and removes notifications through the composable', () => {
    const store = useNotificationStore()
    const notifications = useGlobalNotifications()
    const id = notifications.showSuccess('Saved')
    expect(store.notifications[0].message).toBe('Saved')
    notifications.removeNotification(id)
    expect(store.notifications).toHaveLength(0)
  })

  it('clears every notification', () => {
    const store = useNotificationStore()
    const notifications = useGlobalNotifications()
    notifications.showError('Boom')
    notifications.showInfo('Hello')
    notifications.clearAllNotifications()
    expect(store.notifications).toHaveLength(0)
  })
})
