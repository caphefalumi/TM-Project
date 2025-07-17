const refreshAccessToken = async () => {
  const PORT = import.meta.env.VITE_API_PORT
  try {
    console.log('Attempting to refresh access token...')
    const response = await fetch(`http://localhost:${PORT}/api/tokens/access`, {
      method: 'GET',
      credentials: 'include', // Important for cookies - sends refresh token
    })

    if (response.ok) {
      const data = await response.json()
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
    const response = await fetch(`http://localhost:${PORT}/api/users`, {
      method: 'GET',
      credentials: 'include', // Important for cookies
    })

    console.log('Response from Auth Store:', response.ok, 'Status:', response.status)

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

export default {
  getUserByAccessToken,
  refreshAccessToken,
}
