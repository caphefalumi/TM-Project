<template>
  <div class="notifications-container">
    <!-- Notification Bell Icon -->
    <v-btn icon @click="toggleNotifications" :color="hasUnreadNotifications ? 'error' : 'default'">
      <v-icon v-tooltip:bottom="'Notifications'">mdi-bell</v-icon>
      <v-badge
        v-if="unreadCount > 0"
        :content="unreadCount > 99 ? '99+' : unreadCount.toString()"
        color="error"
        overlap
      ></v-badge>
    </v-btn>

    <!-- Notifications Dropdown/Menu -->
    <v-menu
      v-model="showNotifications"
      :close-on-content-click="false"
      location="bottom end"
      offset="10"
      max-width="400"
      max-height="500"
    >
      <template v-slot:activator="{ props }">
        <div v-bind="props"></div>
      </template>

      <v-card class="notifications-card" elevation="8">
        <!-- Header -->
        <v-card-title class="d-flex justify-space-between align-center pa-3">
          <span class="text-h6">Notifications</span>
          <div class="d-flex gap-2">
            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              @click="refreshNotifications"
              :loading="loading"
              v-tooltip:bottom="'Refresh'"
            ></v-btn>
            <v-btn
              v-if="unreadCount > 0"
              size="small"
              variant="text"
              @click="markAllAsRead"
              :loading="markingAsRead"
            >
              Mark all read
            </v-btn>
            <v-btn icon="mdi-cog" size="small" variant="text" @click="openSettings"></v-btn>
          </div>
        </v-card-title>

        <v-divider></v-divider>

        <!-- Notifications List -->
        <div class="notifications-list" style="max-height: 400px; overflow-y: auto">
          <div v-if="loading" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-2">Loading notifications...</p>
          </div>

          <div v-else-if="notifications.length === 0" class="text-center pa-4">
            <v-icon size="48" color="grey-lighten-1">mdi-bell-off</v-icon>
            <p class="text-grey mt-2">No notifications yet</p>
          </div>

          <div v-else>
            <v-list density="compact">
              <v-list-item
                v-for="notification in notifications"
                :key="notification._id"
                @click="handleNotificationClick(notification)"
                :class="{ 'notification-unread': !notification.isRead }"
                class="notification-item"
              >
                <template v-slot:prepend>
                  <v-icon
                    :color="getNotificationColor(notification.type)"
                    :icon="getNotificationIcon(notification.type)"
                  ></v-icon>
                </template>

                <v-list-item-title class="text-wrap">
                  {{ notification.title }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-wrap mt-1">
                  {{ notification.message }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end">
                    <small class="text-grey">{{ formatTime(notification.createdAt) }}</small>
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      @click.stop="deleteNotification(notification._id)"
                      class="mt-1"
                    ></v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <!-- Load More Button -->
            <div v-if="hasMoreNotifications" class="text-center pa-2">
              <v-btn variant="text" @click="loadMoreNotifications" :loading="loadingMore">
                Load More
              </v-btn>
            </div>
          </div>
        </div>
      </v-card>
    </v-menu>

    <!-- Notification Settings Dialog -->
    <v-dialog v-model="showSettings" max-width="500">
      <v-card>
        <v-card-title>Notification Settings</v-card-title>
        <v-card-text>
          <div class="mb-4">
            <h3 class="mb-2">Global Settings</h3>
            <v-switch
              v-model="preferences.globalSettings.enableAllNotifications"
              label="Enable all notifications"
              color="primary"
            ></v-switch>

            <v-text-field
              v-model="preferences.globalSettings.maxNotificationsToKeep"
              label="Maximum notifications to keep"
              type="number"
              min="10"
              max="1000"
              hint="Older notifications will be automatically deleted"
            ></v-text-field>
          </div>

          <div>
            <h3 class="mb-2">Notification Types</h3>
            <div v-for="(pref, type) in filteredPreferences" :key="type" class="mb-3">
              <v-card variant="outlined" class="pa-3">
                <div class="d-flex justify-space-between align-center">
                  <span class="font-weight-medium">{{ formatNotificationType(type) }}</span>
                  <v-switch v-model="pref.enabled" color="primary" hide-details></v-switch>
                </div>
              </v-card>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showSettings = false" variant="outlined">Cancel</v-btn>
          <v-btn color="primary" @click="saveSettings" :loading="savingSettings" variant="outlined"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Props
const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
})

// Reactive data
const showNotifications = ref(false)
const showSettings = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const markingAsRead = ref(false)
const savingSettings = ref(false)

const notifications = ref([])
const unreadCount = ref(0)
const currentPage = ref(1)
const hasMoreNotifications = ref(false)

const preferences = ref({
  globalSettings: {
    enableAllNotifications: true,
    maxNotificationsToKeep: 100,
  },
  preferences: {
    team_member_added: { enabled: true },
    announcement_liked: { enabled: true },
    announcement_commented: { enabled: true },
    comment_replied: { enabled: true },
    team_announcement_created: { enabled: true },
  },
})

// Computed
const hasUnreadNotifications = computed(() => unreadCount.value > 0)

// Filter out admin notifications from user preferences UI
const filteredPreferences = computed(() => {
  const filtered = {}
  for (const [type, pref] of Object.entries(preferences.value.preferences)) {
    if (type !== 'admin') {
      filtered[type] = pref
    }
  }
  return filtered
})

// Methods
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    loadNotifications()
  }
}

const refreshNotifications = () => {
  loadNotifications()
}

const loadNotifications = async (page = 1) => {
  if (page === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/notifications/${props.userId}?page=${page}&limit=20`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.ok) {
      const data = await response.json()

      if (page === 1) {
        notifications.value = data.notifications
      } else {
        notifications.value.push(...data.notifications)
      }

      unreadCount.value = data.pagination.unreadCount
      hasMoreNotifications.value = data.pagination.hasMore
      currentPage.value = page
    } else {
      console.log('Failed to load notifications')
    }
  } catch (error) {
    console.log('Error loading notifications:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMoreNotifications = () => {
  loadNotifications(currentPage.value + 1)
}

const markAllAsRead = async () => {
  markingAsRead.value = true

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/notifications/${props.userId}/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markAllAsRead: true }),
    })

    if (response.ok) {
      // Update local state
      notifications.value.forEach((notification) => {
        notification.isRead = true
        notification.readAt = new Date()
      })
      unreadCount.value = 0
    } else {
      console.log('Failed to mark notifications as read')
    }
  } catch (error) {
    console.log('Error marking notifications as read:', error)
  } finally {
    markingAsRead.value = false
  }
}

const handleNotificationClick = async (notification) => {
  // Mark as read if not already read
  if (!notification.isRead) {
    await markNotificationAsRead(notification._id)
    notification.isRead = true
    notification.readAt = new Date()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  // Navigate based on notification type and related data
  if (notification.relatedData) {
    const { teamId, announcementId, type } = notification.relatedData
    let targetRoute = null

    // Handle different notification types with specific navigation
    switch (notification.type) {
      case 'team_member_added':
        // User was added to a team - go to team page
        if (teamId) {
          targetRoute = `/teams/${teamId}`
        }
        break

      case 'comment_replied':
        // Someone replied to user's comment - go to team page with announcement focus
        if (teamId && announcementId) {
          targetRoute = `/teams/${teamId}?announcement=${announcementId}`
        } else if (teamId) {
          targetRoute = `/teams/${teamId}`
        }
        break

      case 'team_announcement_created':
        // New announcement in user's team - go to team page with announcement focus
        if (teamId && announcementId) {
          targetRoute = `/teams/${teamId}?announcement=${announcementId}`
        } else if (teamId) {
          targetRoute = `/teams/${teamId}`
        }
        break

      case 'announcement_liked':
      case 'announcement_commented':
        // For other announcement-related notifications, try to navigate to team if available
        if (teamId && announcementId) {
          targetRoute = `/teams/${teamId}?announcement=${announcementId}`
        } else if (teamId) {
          targetRoute = `/teams/${teamId}`
        }
        break

      default:
        // Fallback for any other notification types
        if (teamId && announcementId) {
          targetRoute = `/teams/${teamId}?announcement=${announcementId}`
        } else if (teamId) {
          targetRoute = `/teams/${teamId}`
        }
        break
    }

    // Navigate to target route if available
    if (targetRoute) {
      // Simple navigation - the TeamDetails component now properly watches for route changes
      await router.push(targetRoute)
    }
  }

  showNotifications.value = false
}

const markNotificationAsRead = async (notificationId) => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    await fetch(`${PORT}/api/notifications/${props.userId}/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId }),
    })
  } catch (error) {
    console.log('Error marking notification as read:', error)
  }
}

const deleteNotification = async (notificationId) => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/notifications/${props.userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId }),
    })

    if (response.ok) {
      // Remove from local state
      const index = notifications.value.findIndex((n) => n._id === notificationId)
      if (index !== -1) {
        const notification = notifications.value[index]
        if (!notification.isRead) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        notifications.value.splice(index, 1)
      }
    } else {
      console.log('Failed to delete notification')
    }
  } catch (error) {
    console.log('Error deleting notification:', error)
  }
}

const openSettings = () => {
  showSettings.value = true
  loadPreferences()
}

const loadPreferences = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/notifications/${props.userId}/preferences`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      preferences.value = data.preferences
    }
  } catch (error) {
    console.log('Error loading preferences:', error)
  }
}

const saveSettings = async () => {
  savingSettings.value = true

  try {
    const PORT = import.meta.env.VITE_API_PORT

    // Preserve admin preferences when saving (always keep them enabled)
    const preferencesToSave = {
      ...preferences.value.preferences,
      admin: { enabled: true }, // Admin notifications should always be enabled
    }

    const response = await fetch(`${PORT}/api/notifications/${props.userId}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: preferencesToSave,
        globalSettings: preferences.value.globalSettings,
      }),
    })

    if (response.ok) {
      showSettings.value = false
    } else {
      console.log('Failed to save preferences')
    }
  } catch (error) {
    console.log('Error saving preferences:', error)
  } finally {
    savingSettings.value = false
  }
}

const getNotificationIcon = (type) => {
  const icons = {
    team_member_added: 'mdi-account-plus',
    announcement_liked: 'mdi-heart',
    announcement_commented: 'mdi-comment',
    comment_replied: 'mdi-reply',
    team_announcement_created: 'mdi-bullhorn',
    admin: 'mdi-shield-crown',
  }
  return icons[type] || 'mdi-bell'
}

const getNotificationColor = (type) => {
  const colors = {
    team_member_added: 'success',
    announcement_liked: 'pink',
    announcement_commented: 'info',
    comment_replied: 'info',
    team_announcement_created: 'primary',
    admin: 'warning',
  }
  return colors[type] || 'grey'
}

const formatNotificationType = (type) => {
  const labels = {
    team_member_added: 'Team Member Added',
    announcement_liked: 'Announcement Liked',
    announcement_commented: 'Announcement Commented',
    comment_replied: 'Comment Replied',
    team_announcement_created: 'New Team Announcement',
    admin: 'Admin Notification',
  }
  return labels[type] || type
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// Lifecycle
onMounted(() => {
  // Load initial notification count
  loadNotifications()
})
</script>

<style scoped>
.notifications-container {
  position: relative;
}

.notifications-card {
  min-width: 350px;
  max-width: 400px;
}

.notifications-list {
  background-color: #fafafa;
}

.notification-item {
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.notification-unread {
  background-color: rgba(25, 118, 210, 0.08);
  border-left: 4px solid #1976d2;
}

.notification-unread::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background-color: #1976d2;
  border-radius: 50%;
}
</style>
