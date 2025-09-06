<template>
  <div v-if="visible" class="security-warning-overlay" @click="handleOverlayClick">
    <div class="security-warning-modal" @click.stop>
      <div class="warning-header">
        <div class="warning-icon">
          {{ getIcon(notification.type) }}
        </div>
        <div class="warning-content">
          <h3>{{ notification.title }}</h3>
          <p>{{ notification.message }}</p>
        </div>
        <button @click="dismiss" class="close-btn">×</button>
      </div>

      <div class="warning-actions">
        <button
          v-for="action in notification.actions"
          :key="action.action"
          @click="handleAction(action.action)"
          :class="getActionClass(action.action)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SecurityWarning',
  data() {
    return {
      visible: false,
      notification: null
    }
  },
  mounted() {
    // Listen for security warnings
    window.addEventListener('session-security-warning', this.handleSecurityWarning)
  },
  beforeUnmount() {
    window.removeEventListener('session-security-warning', this.handleSecurityWarning)
  },
  methods: {
    handleSecurityWarning(event) {
      this.notification = event.detail
      this.visible = true
    },

    handleAction(action) {
      switch (action) {
        case 'review-sessions':
          this.$emit('review-sessions')
          break
        case 'manage-sessions':
          this.$emit('manage-sessions')
          break
        case 'secure-account':
          this.$emit('secure-account')
          break
        case 'continue':
          // Just dismiss for now
          break
        case 'logout':
          this.$emit('logout')
          break
        case 'dismiss':
        default:
          break
      }

      this.dismiss()
    },

    dismiss() {
      this.visible = false
      this.notification = null
    },

    handleOverlayClick() {
      // Allow dismissing by clicking overlay for non-critical warnings
      if (this.notification?.type !== 'critical') {
        this.dismiss()
      }
    },

    getIcon(type) {
      switch (type) {
        case 'warning': return '⚠️'
        case 'critical': return '🚨'
        case 'info': return 'ℹ️'
        default: return '🔔'
      }
    },

    getActionClass(action) {
      switch (action) {
        case 'secure-account':
        case 'logout':
          return 'btn-danger'
        case 'review-sessions':
        case 'manage-sessions':
          return 'btn-primary'
        case 'continue':
          return 'btn-secondary'
        case 'dismiss':
        default:
          return 'btn-secondary'
      }
    }
  }
}
</script>

<style scoped>
.security-warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

.security-warning-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  margin: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

.warning-header {
  display: flex;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid #eee;
}

.warning-icon {
  font-size: 32px;
  margin-right: 16px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-content h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 20px;
}

.warning-content p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.warning-actions {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.warning-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4A90E2;
  color: white;
}

.btn-primary:hover {
  background: #357abd;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .warning-actions {
    flex-direction: column;
  }

  .warning-actions button {
    width: 100%;
  }
}
</style>
