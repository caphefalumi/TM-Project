/**
 * API Client with automatic token refresh on 401 errors
 * 
 * This module provides a centralized fetch wrapper that automatically handles
 * expired access tokens by refreshing them and retrying the original request.
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

const API_PORT = import.meta.env.VITE_API_PORT

/**
 * Refresh the access token using the refresh token cookie
 * @returns {Promise<{success: boolean, tokenRevoked?: boolean, message?: string}>}
 */
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
          
          // Clear all caches when token is invalid/revoked
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
        console.error('[API Client] Error parsing refresh response:', parseError)
      }
    }

    console.error('[API Client] Failed to refresh access token:', response.statusText)
    return { success: false, tokenRevoked: false }
  } catch (error) {
    console.error('[API Client] Error refreshing access token:', error)
    return { success: false, tokenRevoked: false }
  }
}

/**
 * Enhanced fetch with automatic token refresh on 401 errors
 * 
 * This wrapper intercepts 401 Unauthorized responses, attempts to refresh
 * the access token, and retries the original request once.
 * 
 * @param {string} url - The URL to fetch (can be relative or absolute)
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.)
 * @param {number} retryCount - Internal retry counter (don't set manually)
 * @returns {Promise<Response>} - The fetch Response object
 * 
 * @example
 * const response = await fetchWithTokenRefresh('/api/teams/123', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * })
 * 
 * if (response.ok) {
 *   const data = await response.json()
 *   // Handle success
 * }
 */
export const fetchWithTokenRefresh = async (url, options = {}, retryCount = 0) => {
  // Ensure credentials are included for cookie-based auth
  const fetchOptions = {
    ...options,
    credentials: options.credentials || 'include',
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
        // Retry the original request with refreshed token
        return await fetchWithTokenRefresh(url, options, 1)
      } else if (refreshResult.tokenRevoked) {
        console.error('[API Client] Token was revoked, user needs to login again')
        
        // Emit custom event for App.vue to show sign-out dialog
        window.dispatchEvent(new CustomEvent('token-revoked', {
          detail: { message: refreshResult.message }
        }))
        
        return response // Return original 401 response
      } else {
        console.error('[API Client] Token refresh failed, returning 401 response')
        return response // Return original 401 response
      }
    }

    // Already retried once, return the 401 response
    console.warn(`⚠️ [API Client] Already retried once for ${url}, returning 401`)
    return response
  } catch (error) {
    console.error(`[API Client] Fetch error for ${url}:`, error)
    throw error
  }
}

/**
 * Convenience wrapper for JSON responses with automatic token refresh
 * 
 * This function wraps fetchWithTokenRefresh and automatically parses JSON responses.
 * It's useful for most API calls that return JSON data.
 * 
 * @param {string} url - The URL to fetch (can be relative or absolute)
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<{ok: boolean, status: number, data: any}>} - Parsed response
 * 
 * @example
 * const { ok, status, data } = await fetchJSON('/api/teams', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * })
 * 
 * if (ok) {
 *   console.log('Teams:', data.teams)
 * } else {
 *   console.error('Failed:', data.message)
 * }
 */
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
    console.error('[API Client] Failed to parse response:', error)
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
