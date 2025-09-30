import { defineStore } from 'pinia'
import AuthStore from '../scripts/authStore.js'

const isClient = typeof window !== 'undefined'
const hasBroadcastChannel = isClient && 'BroadcastChannel' in window

const tabId =
  isClient && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`

const broadcastChannel = hasBroadcastChannel ? new BroadcastChannel('auth-store') : null
let channelInitialized = false

const normalizeUser = (userData) => {
  if (!userData) return null

  return {
    userId: userData.userId ? userData.userId.toString() : '',
    username: userData.username || '',
    email: userData.email || '',
    pendingEmail: userData.pendingEmail || null,
    emailVerified: userData.emailVerified !== false,
    lastUsernameChangeAt: userData.lastUsernameChangeAt || null,
    lastEmailChangeAt: userData.lastEmailChangeAt || null,
    emailVerificationExpires: userData.emailVerificationExpires || null,
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    user: null,
    lastUpdateSource: tabId,
  }),
  getters: {
    hasUser: (state) => !!state.user,
    isExternalUpdate: (state) => state.lastUpdateSource !== tabId,
  },
  actions: {
    setAuthentication({ isLoggedIn, user }, source = tabId, shouldBroadcast = true) {
      this.isLoggedIn = !!isLoggedIn
      this.user = user ? { ...user } : null
      this.lastUpdateSource = source

      if (!this.isLoggedIn) {
        this.user = null
      }

      if (shouldBroadcast) {
        this.broadcastState(source)
      }
    },
    setLoggedIn(value, source = tabId, shouldBroadcast = true) {
      this.setAuthentication({ isLoggedIn: value, user: value ? this.user : null }, source, shouldBroadcast)
    },
    setUser(user, source = tabId, shouldBroadcast = true) {
      const normalized = user ? { ...user } : null
      this.setAuthentication({ isLoggedIn: !!normalized, user: normalized }, source, shouldBroadcast)
      return this.user
    },
    setUserFromApi(userData, source = tabId, shouldBroadcast = true) {
      const normalized = normalizeUser(userData)
      this.setAuthentication({ isLoggedIn: !!normalized, user: normalized }, source, shouldBroadcast)
      return normalized
    },
    clearAuth(source = tabId, shouldBroadcast = true) {
      this.setAuthentication({ isLoggedIn: false, user: null }, source, shouldBroadcast)
    },
    broadcastState(source = tabId) {
      if (!broadcastChannel) return

      broadcastChannel.postMessage({
        source,
        payload: {
          isLoggedIn: this.isLoggedIn,
          user: this.user,
        },
      })
    },
    initCrossTabSync() {
      if (!broadcastChannel || channelInitialized) return

      channelInitialized = true

      broadcastChannel.addEventListener('message', (event) => {
        const { source, payload } = event.data || {}
        if (!payload || source === tabId) {
          return
        }

        this.setAuthentication(
          {
            isLoggedIn: payload.isLoggedIn,
            user: payload.user ? { ...payload.user } : null,
          },
          source,
          false,
        )
      })
    },
    async fetchUser(source = tabId) {
      const userData = await AuthStore.getUserByAccessToken()
      if (userData) {
        return this.setUserFromApi(userData, source)
      }

      return null
    },
    async ensureUser(source = tabId) {
      if (this.user) {
        return this.user
      }

      return await this.fetchUser(source)
    },
    async logout() {
      await AuthStore.logout()
      this.clearAuth()
    },
  },
})

export { tabId as authStoreTabId }
