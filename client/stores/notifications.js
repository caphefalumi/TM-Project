import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notifications', () => {
  // State
  const notifications = ref([])
  const nextId = ref(1)

  // Notification types
  const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    UPDATE: 'update',
  }

  // Add notification
  const addNotification = (notification) => {
    const id = nextId.value++
    const newNotification = {
      id,
      type: notification.type || NOTIFICATION_TYPES.INFO,
      title: notification.title || '',
      message: notification.message || '',
      // duration: notification.duration || 5000,
      persistent: notification.persistent || false, // Don't auto-hide
      actions: notification.actions || [], // Array of action buttons
      data: notification.data || null, // Additional data for the notification
      timestamp: Date.now(),
      ...notification,
    }

    notifications.value.unshift(newNotification)

    // // Auto-remove after duration if not persistent
    // if (!newNotification.persistent && newNotification.duration > 0) {
    //   setTimeout(() => {
    //     removeNotification(id)
    //   }, newNotification.duration)
    // }

    return id
  }

  // Remove notification
  const removeNotification = (id) => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  // Clear all notifications
  const clearAll = () => {
    notifications.value = []
  }

  // Convenience methods for different notification types
  const showSuccess = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title: options.title || 'Success',
      message,
      ...options,
    })
  }

  const showError = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      title: options.title || 'Error',
      message,
      // duration: options.duration || 8000, // Errors stay longer
      ...options,
    })
  }

  const showWarning = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      title: options.title || 'Warning',
      message,
      ...options,
    })
  }

  const showInfo = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      title: options.title || 'Info',
      message,
      ...options,
    })
  }

  // Show update confirmation notification
  const showUpdateConfirmation = (updateInfo, onConfirm, onDecline) => {
    return addNotification({
      type: NOTIFICATION_TYPES.UPDATE,
      title: 'Update Available',
      message: `Version ${updateInfo.version} is available. Do you want to download and install it now?`,
      persistent: true, // Don't auto-hide
      actions: [
        {
          label: 'Install Now',
          color: 'primary',
          handler: onConfirm,
        },
        {
          label: 'Later',
          color: 'grey',
          variant: 'outlined',
          handler: onDecline,
        },
      ],
      data: updateInfo,
    })
  }

  // Show update progress notification
  const showUpdateProgress = (progress = 0) => {
    return addNotification({
      type: NOTIFICATION_TYPES.UPDATE,
      title: 'Downloading Update',
      message: `Downloading update... ${Math.round(progress)}%`,
      persistent: true,
      progress: progress,
      showProgress: true,
    })
  }

  return {
    // State
    notifications,

    // Constants
    NOTIFICATION_TYPES,

    // Actions
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUpdateConfirmation,
    showUpdateProgress,
  }
})
