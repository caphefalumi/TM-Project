/**
 * API Client with automatic token refresh on 401 errors and CSRF protection
 *
 * This module provides a centralized fetch wrapper that automatically handles
 * expired access tokens by refreshing them and retrying the original request,
 * and includes CSRF tokens for state-changing requests.
 *
 * Usage:
 *   import { fetchWithTokenRefresh, fetchJSON } from '../scripts/apiClient.js'
 *
 *   // Using fetchWithTokenRefresh (returns Response object)
 *   const response = await fetchWithTokenRefresh('/api/teams', { method: 'GET' })
 *
 *   // Using fetchJSON (returns parsed JSON)
 *   const { ok, status, data } = await fetchJSON('/api/teams', { method: 'GET' })
 */

import { useComponentCache } from '../composables/useComponentCache.js'
import { getCsrfToken, addCsrfHeader } from '../services/csrfService.js'

const API_PORT = import.meta.env.VITE_API_PORT || 'http://localhost:3000'

const refreshAccessToken = async () => {
  try {
    console.log('[API Client] Attempting to refresh access token...')
    const response = await fetch(`${API_PORT}/api/auth/tokens/access`, {
      method: 'GET',
      credentials: 'include', // Important for cookies - sends refresh token
    })

    if (response.ok) {
      console.log('[API Client] Access token refreshed successfully')
      return { success: true }
    } else if (response.status === 401) {
      // Check if it's a token revocation/expiration error
      try {
        const errorData = await response.json()
        if (errorData.error === 'TOKEN_REVOKED' || errorData.error === 'TOKEN_INVALID') {
          console.warn('⚠️ [API Client] Token was revoked or invalid:', errorData.error)

          const { clearAllCaches } = useComponentCache()
          clearAllCaches()
          console.log('[API Client] Cleared all caches due to invalid/revoked token')

          return {
            success: false,
            tokenRevoked: true,
            message: errorData.message || 'Your session has been terminated. Please sign in again.',
          }
        }
      } catch (parseError) {
        console.log('[API Client] Error parsing refresh response:', parseError)
      }
    }

    console.log('[API Client] Failed to refresh access token:', response.statusText)
    return { success: false, tokenRevoked: false }
  } catch (error) {
    console.log('[API Client] Error refreshing access token:', error)
    return { success: false, tokenRevoked: false }
  }
}

export const fetchWithTokenRefresh = async (url, options = {}, retryCount = 0) => {
  const fetchOptions = {
    ...options,
    credentials: options.credentials || 'include',
  }

  // Add CSRF token for non-GET requests
  const method = fetchOptions.method?.toUpperCase() || 'GET'
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    await getCsrfToken()
    fetchOptions.headers = addCsrfHeader(fetchOptions.headers || {})
  }

  try {
    const response = await fetch(url, fetchOptions)

    // If request succeeded or it's not a 401, return as-is
    if (response.ok || response.status !== 401) {
      return response
    }

    // Handle 401 - Try to refresh token (only once to prevent infinite loops)
    if (response.status === 401 && retryCount === 0) {
      console.log(`[API Client] Received 401 for ${url}, attempting token refresh...`)

      const refreshResult = await refreshAccessToken()

      if (refreshResult.success) {
        console.log(`[API Client] Token refreshed successfully, retrying request to ${url}`)
        return await fetchWithTokenRefresh(url, options, 1)
      } else if (refreshResult.tokenRevoked) {
        console.log('[API Client] Token was revoked, user needs to login again')

        window.dispatchEvent(
          new CustomEvent('token-revoked', {
            detail: { message: refreshResult.message },
          }),
        )

        return response
      } else {
        console.log('[API Client] Token refresh failed, returning 401 response')
        return response
      }
    }

    console.warn(`⚠️ [API Client] Already retried once for ${url}, returning 401`)
    return response
  } catch (error) {
    console.log(`[API Client] Fetch error for ${url}:`, error)
    throw error
  }
}

export const fetchJSON = async (url, options = {}) => {
  const response = await fetchWithTokenRefresh(url, options)

  let data = null
  try {
    // Only try to parse JSON if there's content
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // Try to parse anyway, but catch errors
      const text = await response.text()
      if (text) {
        try {
          data = JSON.parse(text)
        } catch (e) {
          data = { message: text }
        }
      }
    }
  } catch (error) {
    console.log('[API Client] Failed to parse response:', error)
    data = { error: 'Failed to parse response', details: error.message }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
  }
}

export default {
  fetchWithTokenRefresh,
  fetchJSON,
}
