/**
 * CSRF Token Service
 * Manages CSRF token retrieval and inclusion in API requests
 */

let csrfToken = null

/**
 * Fetch CSRF token from the server
 */
export async function fetchCsrfToken() {
  try {
    const PORT = import.meta.env.VITE_API_PORT || 'http://localhost:3000'
    const response = await fetch(`${PORT}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      csrfToken = data.csrfToken
      return csrfToken
    } else {
      console.error('Failed to fetch CSRF token')
      return null
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error)
    return null
  }
}

/**
 * Get the current CSRF token, fetching it if not already available
 */
export async function getCsrfToken() {
  if (!csrfToken) {
    await fetchCsrfToken()
  }
  return csrfToken
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers = {}) {
  if (csrfToken) {
    return {
      ...headers,
      'x-csrf-token': csrfToken,
    }
  }
  return headers
}

/**
 * Enhanced fetch with automatic CSRF token inclusion
 */
export async function fetchWithCsrf(url, options = {}) {
  // Ensure we have a CSRF token for non-GET requests
  if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
    await getCsrfToken()
  }

  // Add CSRF token to headers
  const headers = addCsrfHeader(options.headers || {})

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  })
}

/**
 * Initialize CSRF token on app startup
 */
export async function initializeCsrf() {
  await fetchCsrfToken()
}

export default {
  fetchCsrfToken,
  getCsrfToken,
  addCsrfHeader,
  fetchWithCsrf,
  initializeCsrf,
}
