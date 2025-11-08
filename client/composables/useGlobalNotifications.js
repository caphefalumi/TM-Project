import { useNotificationStore } from '../stores/notifications.js'

/**
 * Composable for using global notifications
 * This provides a simple API for components to show notifications
 * that will be displayed in the global notification system
 */
export function useGlobalNotifications() {
  const notificationStore = useNotificationStore()

  /**
   * Show a success notification
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  const showSuccess = (message, options = {}) => {
    return notificationStore.showSuccess(message, options)
  }

  /**
   * Show an error notification
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  const showError = (message, options = {}) => {
    return notificationStore.showError(message, options)
  }

  /**
   * Show a warning notification
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  const showWarning = (message, options = {}) => {
    return notificationStore.showWarning(message, options)
  }

  /**
   * Show an info notification
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  const showInfo = (message, options = {}) => {
    return notificationStore.showInfo(message, options)
  }

  /**
   * Show a custom notification
   * @param {object} notification - The notification object
   */
  const showNotification = (notification) => {
    return notificationStore.addNotification(notification)
  }

  /**
   * Remove a notification
   * @param {number} id - The notification ID
   */
  const removeNotification = (id) => {
    return notificationStore.removeNotification(id)
  }

  /**
   * Clear all notifications
   */
  const clearAllNotifications = () => {
    return notificationStore.clearAll()
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    removeNotification,
    clearAllNotifications,
  }
}
