import AuthStore from '../scripts/authStore.js'

const { refreshAccessToken } = AuthStore

/**
 * Authenticated API client that handles token refresh automatically
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} retryCount - Internal retry counter (don't set manually)
 * @returns {Promise<Response>} - Fetch response
 */
const apiClient = async (url, options = {}, retryCount = 0) => {
  const PORT = import.meta.env.VITE_API_PORT
  const fullUrl = url.startsWith('http') ? url : `http://localhost:${PORT}${url}`

  // Ensure credentials are included for cookie-based auth
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    console.log(`API Call: ${defaultOptions.method || 'GET'} ${fullUrl}`)
    const response = await fetch(fullUrl, defaultOptions)

    // If we get a 401 (Unauthorized) and haven't retried yet, try to refresh the token
    if (response.status === 401 && retryCount === 0) {
      console.log('API call got 401, attempting token refresh...')
      const refreshSuccess = await refreshAccessToken()

      if (refreshSuccess) {
        console.log('Token refreshed successfully, retrying API call...')
        // Retry the original request with fresh token
        return await apiClient(url, options, 1) // Prevent infinite recursion
      } else {
        console.error('Token refresh failed')
        // Redirect to login if refresh fails
        window.location.href = '/login'
        return response
      }
    }

    return response
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

/**
 * Convenience method for GET requests
 */
const get = (url, options = {}) => {
  return apiClient(url, { ...options, method: 'GET' })
}

/**
 * Convenience method for POST requests
 */
const post = (url, data, options = {}) => {
  return apiClient(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Convenience method for PUT requests
 */
const put = (url, data, options = {}) => {
  return apiClient(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Convenience method for DELETE requests
 */
const del = (url, options = {}) => {
  return apiClient(url, { ...options, method: 'DELETE' })
}

export default {
  apiClient,
  get,
  post,
  put,
  delete: del,
}
