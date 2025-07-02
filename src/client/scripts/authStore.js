const getUserByAccessToken = async () => {
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const response = await fetch(`http://localhost:${PORT}/api/users`, {
    method: 'GET',
    credentials: 'include', // Important for cookies
    })
    console.log("Response from Auth Store:", response.ok)
    if (response.ok) {
        const data = await response.json()
        //console.log('User data fetched successfully:', data.user)
        return data.user
    } else {
        console.error('Failed to fetch user data:', response.statusText)
        return null
    }
  } catch( error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

export default {
    getUserByAccessToken,
}