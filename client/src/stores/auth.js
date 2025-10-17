import { defineStore } from 'pinia'
import { useComponentCache } from '../composables/useComponentCache.js'

const isClient = typeof window !== 'undefined'

const tabId =
  isClient && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`

const PORT = import.meta.env.VITE_API_PORT

const normalizeUser = (userData) => {
  if (!userData) return null

  return {
    userId: userData.userId ? userData.userId.toString() : '',
    username: userData.username || '',
    email: userData.email || '',
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
    async refreshAccessToken() {
      try {
        console.log('Attempting to refresh access token...')
        const response = await fetch(`${PORT}/api/auth/tokens/access`, {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          console.log('Access token refreshed successfully')
          return { success: true }
        } else if (response.status === 401) {
          try {
            const errorData = await response.json()
            if (errorData.error === 'TOKEN_REVOKED' || errorData.error === 'TOKEN_INVALID') {
              const { clearAllCaches } = useComponentCache()
              clearAllCaches()
              console.log('[Auth] Cleared all caches due to invalid/revoked token')

              return {
                success: false,
                tokenRevoked: true,
                message: errorData.message || 'Your session has been terminated. Please sign in again.',
              }
            }
          } catch (parseError) {
            console.log('Error parsing response:', parseError)
          }
        }

        console.warn('Refresh access token:', response.statusText)
        return { success: false, tokenRevoked: false }
      } catch (error) {
        console.log('Error refreshing access token:', error)
        return { success: false, tokenRevoked: false }
      }
    },
    async getUserByAccessToken(retryCount = 0) {
      try {
        const response = await fetch(`${PORT}/api/users`, {
          method: 'GET',
          credentials: 'include',
        })

        console.log('Response from Auth Store:', response.ok, 'Status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('User data fetched successfully')
          return data.user
        } else if (response.status === 401 && retryCount === 0) {
          console.log('Access token expired, attempting to refresh...')
          const refreshResult = await this.refreshAccessToken()

          if (refreshResult.success) {
            console.log('Token refreshed, retrying user data fetch...')
            return await this.getUserByAccessToken(1)
          } else {
            console.warn('Token refresh failed, user needs to login again')
            return null
          }
        } else {
          console.log('Failed to fetch user data:', response.statusText, 'Status:', response.status)
          return null
        }
      } catch (error) {
        console.log('Error fetching user data:', error)
        return null
      }
    },
    async fetchUser() {
      const userData = await this.getUserByAccessToken()
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
      try {
        const user = await this.getUserByAccessToken()
        if (!user) {
          console.warn('No user found for logout')
          this.clearAuth()
          return { success: true, message: 'Already logged out' }
        }

        const response = await fetch(`${PORT}/api/sessions/me`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: user.userId }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Logged out successfully:', data.message)
          this.clearAuth()
          return { success: true, message: data.message }
        } else {
          console.log('Logout failed:', response.statusText)
          this.clearAuth()
          return { success: false, error: 'Logout failed' }
        }
      } catch (error) {
        console.log('Error during logout:', error)
        this.clearAuth()
        return { success: false, error: error.message }
      }
    },
  },
})

export { tabId as authStoreTabId }
