import { defineStore } from 'pinia'
import AuthStore from '../scripts/authStore.js'

const isClient = typeof window !== 'undefined'

const tabId =
  isClient && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`

const normalizeUser = (userData) => {
  if (!userData) return null

  return {
    userId: userData.userId ? userData.userId.toString() : '',
    username: userData.username || '',
    email: userData.email || '',
    email: userData.email || null,
    emailVerified: userData.emailVerified !== false,
    lastUsernameChangeAt: userData.lastUsernameChangeAt || null,
    lastEmailChangeAt: userData.lastEmailChangeAt || null,
    emailVerificationExpires: userData.emailVerificationExpires || null,
    createdAt: userData.createdAt || null,
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    user: null,
  }),
  getters: {
    hasUser: (state) => !!state.user,
  },
  actions: {
    setAuthentication({ isLoggedIn, user }) {
      this.isLoggedIn = !!isLoggedIn
      this.user = user ? { ...user } : null
      if (!this.isLoggedIn) {
        this.user = null
      }
    },
    setLoggedIn(value) {
      this.setAuthentication({ isLoggedIn: value, user: value ? this.user : null })
    },
    setUser(user) {
      const normalized = user ? { ...user } : null
      this.setAuthentication({ isLoggedIn: !!normalized, user: normalized })
      return this.user
    },
    setUserFromApi(userData) {
      const normalized = normalizeUser(userData)
      this.setAuthentication({ isLoggedIn: !!normalized, user: normalized })
      return normalized
    },
    clearAuth() {
      this.setAuthentication({ isLoggedIn: false, user: null })
    },
    async fetchUser() {
      const userData = await AuthStore.getUserByAccessToken()
      if (userData) {
        return this.setUserFromApi(userData)
      }
      return null
    },
    async ensureUser() {
      if (this.user) {
        return this.user
      }
      return await this.fetchUser()
    },
    async logout() {
      await AuthStore.logout()
      this.clearAuth()
    },
  },
})

export { tabId as authStoreTabId }
