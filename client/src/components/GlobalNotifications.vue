<template>
  <div class="global-notifications">
    <div v-if="notifications.length > 1" class="notification-dropdown-toggle" @click="toggleDropdown">
      <v-btn icon size="small">
        <v-icon>{{ dropdownExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </v-btn>
      <span>{{ dropdownExpanded ? 'Hide' : 'Show' }} all notifications ({{ notifications.length }})</span>
    </div>
    <transition-group
      name="notification"
      tag="div"
      class="notification-stack"
    >
      <div
        v-for="(notification, index) in visibleNotifications"
        :key="notification.id"
        :class="[
          'notification-item',
          `notification-${notification.type}`,
          { 'notification-with-actions': notification.actions?.length > 0 }
        ]"
        :style="{
          zIndex: 9999 + notifications.length - index,
          transform: dropdownExpanded ? `translateY(${index * 90}px)` : `translateY(${index * 8}px)`,
          opacity: 1
        }"
      >
        <!-- Close button -->
        <button
          v-if="!notification.persistent || notification.actions?.length === 0"
          class="notification-close"
          @click="removeNotification(notification.id)"
          aria-label="Close notification"
        >
          <v-icon size="18">mdi-close</v-icon>
        </button>

        <!-- Notification icon -->
        <div class="notification-icon">
          <v-icon :color="getIconColor(notification.type)">
            {{ getIcon(notification.type) }}
          </v-icon>
        </div>

        <!-- Notification content -->
        <div class="notification-content">
          <div class="notification-title" v-if="notification.title">
            {{ notification.title }}
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>

          <!-- Progress bar for updates -->
          <div v-if="notification.showProgress" class="notification-progress">
            <v-progress-linear
              :model-value="notification.progress || 0"
              color="primary"
              height="4"
              rounded
            ></v-progress-linear>
          </div>
        </div>

        <!-- Action buttons -->
        <div v-if="notification.actions?.length > 0" class="notification-actions">
          <v-btn
            v-for="action in notification.actions"
            :key="action.label"
            :color="action.color || 'primary'"
            :variant="action.variant || 'elevated'"
            size="small"
            class="mr-2"
            @click="handleAction(action, notification)"
          >
            {{ action.label }}
          </v-btn>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useNotificationStore } from '../stores/notifications.js'

const notificationStore = useNotificationStore()

// Computed
const notifications = computed(() => notificationStore.notifications)
const dropdownExpanded = ref(false)
const toggleDropdown = () => {
  dropdownExpanded.value = !dropdownExpanded.value
}
const visibleNotifications = computed(() => {
  return dropdownExpanded.value ? notifications.value : [notifications.value[0]].filter(Boolean)
})

// Methods
const removeNotification = (id) => {
  notificationStore.removeNotification(id)
}

const getIcon = (type) => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
    update: 'mdi-download'
  }
  return icons[type] || 'mdi-information'
}

const getIconColor = (type) => {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
    update: 'primary'
  }
  return colors[type] || 'grey'
}

const handleAction = (action, notification) => {
  if (action.handler && typeof action.handler === 'function') {
    action.handler(notification)
  }

  // Remove notification after action unless it's persistent
  if (!notification.persistent) {
    removeNotification(notification.id)
  }
}
</script>

<style scoped>
.global-notifications {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.notification-stack {
  position: relative;
  width: 400px;
  max-width: 90vw;
}

.notification-item {
  position: absolute;
  right: 0;
  width: 100%;
  min-height: 80px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 16px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 4px;
  opacity: 1 !important;
}

.notification-item:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
}

.notification-success {
  border-left: 4px solid #4caf50;
  background: linear-gradient(135deg, #ffffff 0%, #f8fdf8 100%);
}

.notification-error {
  border-left: 4px solid #f44336;
  background: linear-gradient(135deg, #ffffff 0%, #fef8f8 100%);
}

.notification-warning {
  border-left: 4px solid #ff9800;
  background: linear-gradient(135deg, #ffffff 0%, #fffdf8 100%);
}

.notification-info {
  border-left: 4px solid #2196f3;
  background: linear-gradient(135deg, #ffffff 0%, #f8fcff 100%);
}

.notification-update {
  border-left: 4px solid #9c27b0;
  background: linear-gradient(135deg, #ffffff 0%, #fdf8ff 100%);
}

.notification-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-close:hover {
  background-color: #e0e7ef;
  box-shadow: 0 0 0 2px #b3c2d6;
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 16px;
  line-height: 1.3;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.notification-message {
  font-size: 14px;
  line-height: 1.4;
  color: #666;
  word-wrap: break-word;
}

.notification-progress {
  margin-top: 12px;
}

.notification-actions {
  display: flex;
  align-items: center;
  margin-top: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.notification-with-actions {
  flex-direction: column;
  align-items: stretch;
  padding-bottom: 20px;
}

.notification-with-actions .notification-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.notification-with-actions .notification-icon {
  margin-right: 12px;
  align-self: flex-start;
}

/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.notification-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Responsive design */
@media (max-width: 480px) {
  .global-notifications {
    top: 16px;
    right: 16px;
    left: 16px;
  }

  .notification-stack {
    width: 100%;
  }

  .notification-item {
    padding: 14px 16px;
  }

  .notification-title {
    font-size: 15px;
  }

  .notification-message {
    font-size: 13px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .notification-item {
    background: #2d2d2d;
    border-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .notification-title {
    color: #ffffff;
  }

  .notification-message {
    color: #b0b0b0;
  }

  .notification-success {
    background: linear-gradient(135deg, #2d2d2d 0%, #2d3a2d 100%);
  }

  .notification-error {
    background: linear-gradient(135deg, #2d2d2d 0%, #3a2d2d 100%);
  }

  .notification-warning {
    background: linear-gradient(135deg, #2d2d2d 0%, #3a372d 100%);
  }

  .notification-info {
    background: linear-gradient(135deg, #2d2d2d 0%, #2d333a 100%);
  }

  .notification-update {
    background: linear-gradient(135deg, #2d2d2d 0%, #332d3a 100%);
  }

  .notification-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.notification-dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 8px;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
}

/* Force maximum z-index for all notifications */
.global-notifications,
.global-notifications * {
  z-index: 2147483647 !important; /* Maximum z-index value */
}

.notification-item {
  z-index: 2147483647 !important;
}
</style>
