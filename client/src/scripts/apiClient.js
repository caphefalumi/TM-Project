/**
 * Global API client with token refresh and CSRF protection.
 *
 * Exposes a fetch-compatible wrapper so existing call sites can keep using
 * response.ok/response.json() while requests run through a single Axios client.
 */

import axios from 'axios'
import { useComponentCache } from '../composables/useComponentCache.js'
import { getCsrfToken, addCsrfHeader, fetchCsrfToken } from '../services/csrfService.js'

const API_PORT = import.meta.env.VITE_API_PORT || 'http://localhost:3000'

const apiAxios = axios.create({
  baseURL: API_PORT,
  withCredentials: true,
  validateStatus: () => true,
})

const normalizeHeaders = (headers) => {
  if (!headers) return {}
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }
  return headers
}

const toFetchResponse = (axiosResponse) => {
  const headers = new Headers()
  Object.entries(axiosResponse.headers || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
    }
  })

  let body = null
  if (axiosResponse.data !== undefined && axiosResponse.data !== null) {
    if (typeof axiosResponse.data === 'string') {
      body = axiosResponse.data
    } else if (
      axiosResponse.data instanceof ArrayBuffer ||
      ArrayBuffer.isView(axiosResponse.data)
    ) {
      body = axiosResponse.data
    } else {
      body = JSON.stringify(axiosResponse.data)
      if (!headers.get('content-type')) {
        headers.set('content-type', 'application/json')
      }
    }
  }

  return new Response(body, {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText || '',
    headers,
  })
}

const refreshAccessToken = async () => {
  try {
    console.log('[API Client] Attempting to refresh access token...')
    const response = await apiAxios.request({
      url: '/api/auth/tokens/access',
      method: 'GET',
    })

    if (response.status >= 200 && response.status < 300) {
      console.log('[API Client] Access token refreshed successfully')
      return { success: true }
    } else if (response.status === 401) {
      // Check if it's a token revocation/expiration error
      try {
        const errorData = response.data || {}
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

    console.log('[API Client] Failed to refresh access token:', response.statusText || response.status)
    return { success: false, tokenRevoked: false }
  } catch (error) {
    console.log('[API Client] Error refreshing access token:', error)
    return { success: false, tokenRevoked: false }
  }
}

export const fetchWithTokenRefresh = async (url, options = {}, retryCount = 0) => {
  const fetchOptions = {
    ...options,
  }

  // Add CSRF token for non-GET requests
  const method = fetchOptions.method?.toUpperCase() || 'GET'
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    await getCsrfToken()
    fetchOptions.headers = addCsrfHeader(normalizeHeaders(fetchOptions.headers))
  }

  try {
    const response = await apiAxios.request({
      url,
      method: fetchOptions.method || 'GET',
      headers: normalizeHeaders(fetchOptions.headers),
      data: fetchOptions.body,
      signal: fetchOptions.signal,
      withCredentials: fetchOptions.credentials !== 'omit',
      responseType: 'text',
      transformResponse: [
        (value, headers) => {
          const contentType = headers?.['content-type'] || ''
          if (typeof value === 'string' && contentType.includes('application/json')) {
            try {
              return JSON.parse(value)
            } catch {
              return value
            }
          }
          return value
        },
      ],
    })
    const fetchLikeResponse = toFetchResponse(response)

    // If request succeeded, return as-is
    if (fetchLikeResponse.ok) {
      return fetchLikeResponse
    }

    // Handle 403 CSRF errors — refresh token and retry once
    if (fetchLikeResponse.status === 403 && retryCount === 0) {
      try {
        const cloned = fetchLikeResponse.clone()
        const body = await cloned.json()
        if (body?.error?.includes('CSRF')) {
          await fetchCsrfToken()
          return await fetchWithTokenRefresh(url, options, 1)
        }
      } catch {}
    }

    if (fetchLikeResponse.status !== 401) {
      return fetchLikeResponse
    }

    // Handle 401 - Try to refresh token (only once to prevent infinite loops)
    if (fetchLikeResponse.status === 401 && retryCount === 0) {
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

        return fetchLikeResponse
      } else {
        console.log('[API Client] Token refresh failed, returning 401 response')
        return fetchLikeResponse
      }
    }

    console.warn(`⚠️ [API Client] Already retried once for ${url}, returning 401`)
    return fetchLikeResponse
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
