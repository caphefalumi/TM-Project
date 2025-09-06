import sessionService from './sessionService.js'

const refreshAccessToken = async () => {
  const PORT = import.meta.env.VITE_API_PORT
  try {
    console.log('Attempting to refresh access token...')
    const response = await fetch(`${PORT}/api/auth/tokens/access`, {
      method: 'GET',
      credentials: 'include', // Important for cookies - sends refresh token
    })

    // Check for security warnings
    sessionService.checkSecurityHeaders(response)

    if (response.ok) {
      console.log('Access token refreshed successfully')
      return true
    } else {
      console.error('Failed to refresh access token:', response.statusText)
      return false
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    return false
  }
}

const getUserByAccessToken = async (retryCount = 0) => {
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const response = await fetch(`${PORT}/api/users`, {
      method: 'GET',
      credentials: 'include', // Important for cookies
    })

    console.log('Response from Auth Store:', response.ok, 'Status:', response.status)

    // Check for security warnings
    sessionService.checkSecurityHeaders(response)

    if (response.ok) {
      const data = await response.json()
      console.log('User data fetched successfully')
      return data.user
    } else if (response.status === 401 && retryCount === 0) {
      // Access token might be expired, try to refresh it
      console.log('Access token expired, attempting to refresh...')
      const refreshSuccess = await refreshAccessToken()

      if (refreshSuccess) {
        console.log('Token refreshed, retrying user data fetch...')
        // Retry the original request with the new access token
        return await getUserByAccessToken(1) // Prevent infinite recursion
      } else {
        console.error('Token refresh failed, user needs to login again')
        return null
      }
    } else {
      console.error('Failed to fetch user data:', response.statusText, 'Status:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

// Logout function with session cleanup
const logout = async () => {
  const PORT = import.meta.env.VITE_API_PORT
  try {
    // Get current user to get userId
    const user = await getUserByAccessToken()
    if (!user) {
      console.warn('No user found for logout')
      return { success: true, message: 'Already logged out' }
    }

    const response = await fetch(`${PORT}/api/auth/tokens/refresh`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId: user.userId }),
    })

    if (response.ok) {
      const data = await response.json()
      sessionService.clearWarnings()
      console.log('Logged out successfully:', data.message)
      return { success: true, message: data.message }
    } else {
      console.error('Logout failed:', response.statusText)
      return { success: false, error: 'Logout failed' }
    }
  } catch (error) {
    console.error('Error during logout:', error)
    return { success: false, error: error.message }
  }
}

export default {
  getUserByAccessToken,
  refreshAccessToken,
  logout,
}
