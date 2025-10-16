import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

class UpdateService {
  constructor() {
    this.notificationStore = null
    this.updateInProgress = false
    this.updateNotificationId = null
    this.progressNotificationId = null
  }

  // Initialize the update service
  init(notificationStore) {
    this.notificationStore = notificationStore
  }

  // Check for updates manually
  async checkForUpdates() {
    if (!this.notificationStore) {
      console.error('UpdateService: Notification store not initialized')
    }

    try {
      console.log('Checking for updates...')
      const update = await check()

      if (update) {
        console.log(`Found update ${update.version} from ${update.date}`)
        console.log(`Update notes: ${update.body}`)

        this.showUpdateConfirmation(update)
      } else {
        console.log('No updates available')
        this.notificationStore.showInfo('You are running the latest version', {
          title: 'No Updates Available',
        })
      }
    } catch (error) {
      this.notificationStore.showError('Failed to check for updates. Please try again later.', {
        title: error,
      })
    }
  }

  // Show update confirmation dialog
  showUpdateConfirmation(update) {
    const releaseNotes = update.body ? `\n\nRelease Notes:\n${update.body}` : ''

    this.updateNotificationId = this.notificationStore.showUpdateConfirmation(
      update,
      () => this.downloadAndInstallUpdate(update),
      () => this.declineUpdate(),
    )
  }

  // Handle update confirmation
  async downloadAndInstallUpdate(update) {
    if (this.updateInProgress) {
      return
    }

    this.updateInProgress = true

    // Remove the confirmation notification
    if (this.updateNotificationId) {
      this.notificationStore.removeNotification(this.updateNotificationId)
      this.updateNotificationId = null
    }

    try {
      let downloaded = 0
      let contentLength = 0

      // Show initial progress notification
      this.progressNotificationId = this.notificationStore.showUpdateProgress(0)

      // Download and install the update with progress tracking
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength
            console.log(`Started downloading ${event.data.contentLength} bytes`)
            // Show initial progress notification
            if (!this.progressNotificationId) {
              this.progressNotificationId = this.notificationStore.showUpdateProgress(0)
            }
            break

          case 'Progress':
            downloaded += event.data.chunkLength
            const progress = contentLength > 0 ? (downloaded / contentLength) * 100 : 0
            console.log(`Downloaded ${downloaded} from ${contentLength} (${Math.round(progress)}%)`)
            // Update progress notification
            if (this.progressNotificationId) {
              this.notificationStore.updateNotificationProgress(
                this.progressNotificationId,
                progress,
              )
            }
            break

          case 'Finished':
            console.log('Download finished')

            // Remove progress notification
            if (this.progressNotificationId) {
              this.notificationStore.removeNotification(this.progressNotificationId)
              this.progressNotificationId = null
            }

            // Show completion notification
            this.notificationStore.showSuccess(
              'Update installed successfully. The application will restart now.',
              {
                title: 'Update Complete',
                duration: 3000,
              },
            )
            break
        }
      })

      console.log('Update installed successfully')

      // Wait a moment for the user to see the success message
      setTimeout(async () => {
        try {
          await relaunch()
        } catch (error) {
          console.error('Error relaunching application:', error)
          this.notificationStore.showError(
            'Update installed but failed to restart automatically. Please restart the application manually.',
            { title: 'Restart Required' },
          )
        }
      }, 2000)
    } catch (error) {
      console.error('Error during update:', error)

      // Remove progress notification if it exists
      if (this.progressNotificationId) {
        this.notificationStore.removeNotification(this.progressNotificationId)
        this.progressNotificationId = null
      }

      this.notificationStore.showError(`Failed to download or install update: ${error}`, {
        title: 'Update Failed',
        duration: 10000, // Show error longer
      })
    } finally {
      this.updateInProgress = false
    }
  }

  // Handle update decline
  declineUpdate() {
    if (this.updateNotificationId) {
      this.notificationStore.removeNotification(this.updateNotificationId)
      this.updateNotificationId = null
    }

    console.log('User declined update')
  }

  // Check for updates automatically on app start
  async checkForUpdatesOnStartup() {
    if (!this.notificationStore) {
      console.error('UpdateService: Notification store not initialized')
      return
    }

    try {
      console.log('Checking for updates on startup...')
      const update = await check()

      if (update) {
        console.log(`Found update ${update.version} on startup`)

        // Show a less intrusive notification for automatic checks
        this.notificationStore.showInfo(
          `Version ${update.version} is available. Click here to install.`,
          {
            title: 'Update Available',
            duration: 8000,
            actions: [
              {
                label: 'Install Now',
                color: 'primary',
                handler: () => this.downloadAndInstallUpdate(update),
              },
              {
                label: 'View Details',
                color: 'grey',
                variant: 'outlined',
                handler: () => this.showUpdateConfirmation(update),
              },
            ],
          },
        )
      } else {
        console.log('No updates available on startup')
      }
    } catch (error) {
      console.error('Error checking for updates on startup:', error)
      // Don't show error notifications for automatic startup checks
    }
  }

  // Get current version info
  async getCurrentVersion() {
    try {
      // This would typically come from the Tauri app config
      // For now, we'll use a placeholder
      return '1.0.0'
    } catch (error) {
      console.error('Error getting current version:', error)
      return 'Unknown'
    }
  }
}

// Create and export a singleton instance
export const updateService = new UpdateService()
export default updateService
