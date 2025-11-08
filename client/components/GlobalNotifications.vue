<template>
  <div class="global-notifications">
    <!-- Notification Summary Bar -->
    <transition name="fade">
      <div v-if="notifications.length > 0" class="notification-summary-bar" @click="toggleDropdown">
        <span v-for="type in summaryTypes" :key="type" class="summary-item">
          <v-icon :color="getIconColor(type)" size="18">{{ getIcon(type) }}</v-icon>
          <span class="summary-count">{{ getTypeCount(type) }}</span>
        </span>
        <span class="summary-divider"></span>
        <span class="summary-label">Notifications</span>
        <v-icon size="18" color="white">{{
          dropdownExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'
        }}</v-icon>
      </div>
    </transition>

    <!-- Notification Stack -->
    <transition-group name="notification-list" tag="div" class="notification-stack">
      <div
        v-for="(notification, index) in visibleStackNotifications"
        :key="notification.id"
        :class="['notification-card', `notification-${notification.type}`]"
        :style="getNotificationStyle(index)"
      >
        <!-- Close Button -->
        <button
          v-if="!notification.persistent || notification.actions?.length === 0"
          class="notification-close-btn"
          @click="removeNotification(notification.id)"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>

        <!-- Icon -->
        <div class="notification-icon">
          <v-icon :color="getIconColor(notification.type)" size="24">
            {{ getIcon(notification.type) }}
          </v-icon>
        </div>

        <!-- Content -->
        <div class="notification-body">
          <div v-if="notification.title" class="notification-title">
            {{ notification.title }}
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>

          <!-- Progress Bar -->
          <div v-if="notification.showProgress" class="notification-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${notification.progress}%` }"></div>
            </div>
            <span class="progress-text">{{ Math.round(notification.progress) }}%</span>
          </div>

          <!-- Action Buttons -->
          <div v-if="notification.actions?.length > 0" class="notification-actions">
            <button
              v-for="action in notification.actions"
              :key="action.label"
              :class="[
                'action-btn',
                action.color === 'primary' ? 'action-btn-primary' : 'action-btn-secondary',
              ]"
              @click="handleAction(action, notification)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useNotificationStore } from '../stores/notifications.js'

const notificationStore = useNotificationStore()
const dropdownExpanded = ref(false)

// Computed
const notifications = computed(() => notificationStore.notifications)

const visibleStackNotifications = computed(() => {
  if (dropdownExpanded.value) {
    return notifications.value
  }
  return notifications.value.slice(0, 3)
})

const summaryTypes = ['success', 'error', 'warning', 'info', 'update']

// Methods
const toggleDropdown = () => {
  dropdownExpanded.value = !dropdownExpanded.value
}

const removeNotification = (id) => {
  notificationStore.removeNotification(id)
}

const getIcon = (type) => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
    update: 'mdi-download',
  }
  return icons[type] || 'mdi-information'
}

const getIconColor = (type) => {
  const colors = {
    success: '#037F0C',
    error: '#D13212',
    warning: '#FF9900',
    info: '#0073BB',
    update: '#7D3AC1',
  }
  return colors[type] || '#545B64'
}

const getTypeCount = (type) => {
  return notifications.value.filter((n) => n.type === type).length
}

const getNotificationStyle = (index) => {
  const summaryBarHeight = 52 // Height of summary bar
  if (dropdownExpanded.value) {
    // When expanded, stack notifications vertically with proper spacing
    return {
      transform: 'translateY(0) scale(1)',
      zIndex: 9000 - index,
      top: `${summaryBarHeight + index * 80}px`, // 100px spacing between each notification
    }
  } else {
    // When collapsed, show stacked effect (cards slightly behind each other)
    return {
      transform: `translateY(${index * 8}px) scale(${1 - index * 0.02})`,
      zIndex: 9000 - index,
      top: `${summaryBarHeight}px`,
    }
  }
}

const handleAction = (action, notification) => {
  if (action.handler && typeof action.handler === 'function') {
    action.handler(notification)
  }
  if (!notification.persistent) {
    removeNotification(notification.id)
  }
}
</script>

<style scoped>
/* Notification Summary Bar */
.notification-summary-bar {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #232f3e 0%, #2c3e50 100%);
  color: white;
  padding: 10px 24px;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  z-index: 9998;
  transition: all 0.3s ease;
}

.notification-summary-bar:hover {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.summary-count {
  color: white;
  min-width: 16px;
}

.summary-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
}

.summary-label {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.3px;
}

/* Notification Stack */
.notification-stack {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  max-width: 90vw;
  pointer-events: none;
  z-index: 9997;
}

.notification-card {
  position: absolute;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 16px 20px;
  display: flex;
  gap: 14px;
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-left: 4px solid;
}

.notification-success {
  border-left-color: #037f0c;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.notification-error {
  border-left-color: #d13212;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.notification-warning {
  border-left-color: #ff9900;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.notification-info {
  border-left-color: #0073bb;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.notification-update {
  border-left-color: #7d3ac1;
  background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
}

.notification-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #545b64;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.notification-close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #16191f;
}

.notification-icon {
  flex-shrink: 0;
  padding-top: 2px;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 15px;
  font-weight: 600;
  color: #16191f;
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-message {
  font-size: 14px;
  color: #545b64;
  line-height: 1.5;
  word-wrap: break-word;
}

/* Progress Bar */
.notification-progress {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e9ebed;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0073bb 0%, #00a1e4 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  font-weight: 500;
  color: #545b64;
  min-width: 40px;
  text-align: right;
}

/* Action Buttons */
.notification-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.3px;
}

.action-btn-primary {
  background: #0073bb;
  color: white;
}

.action-btn-primary:hover {
  background: #005a94;
  box-shadow: 0 2px 8px rgba(0, 115, 187, 0.3);
}

.action-btn-secondary {
  background: white;
  color: #545b64;
  border: 1px solid #d5dbdb;
}

.action-btn-secondary:hover {
  background: #f2f3f3;
  border-color: #aab7b8;
}

/* Animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.notification-list-enter-active,
.notification-list-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.notification-list-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.notification-list-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.notification-list-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Responsive */
@media (max-width: 640px) {
  .notification-stack {
    width: calc(100% - 32px);
  }

  .notification-summary-bar {
    padding: 8px 16px;
    gap: 12px;
    font-size: 13px;
  }

  .notification-card {
    padding: 14px 16px;
  }

  .summary-item {
    font-size: 13px;
  }

  .summary-label {
    font-size: 13px;
  }
}
</style>
