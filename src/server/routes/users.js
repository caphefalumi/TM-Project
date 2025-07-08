// src/server/routes/users.js
// This file handles responsibilities related to users in the application
// 1. Adding users to a team
// 2. Retrieving user's team data

import connectDB from '../config/db.js'

import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'

const addUsersToTeam = async (req, res) => {
  // Add users to a team
  await connectDB()
  const users = req.body
  console.log(users)
  if (!users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'Team ID and users array are required' })
  }

  try {
    const userPromises = users.map(async (user) => {
      const { teamId, userId, username, role } = user
      if (!teamId || !userId || !username || !role) {
        throw new Error('TeamId, User ID, username, and role are required for each user')
      }

      // Check that no duplicate userId is added to the same team
      const existingUser = await UsersOfTeam.findOne({ userId, teamId })
      if (existingUser) {
        console.log(`User with ID ${userId} is already added to team ${teamId}`)
        return null
      }

      // Check there is a team with the given teamId
      const teamExists = await UsersOfTeam.exists({ teamId })
      if (!teamExists) {
        console.log(`Team with ID ${teamId} does not exist`)
        return res.status(404).json({ message: `Team with ID ${teamId} does not exist` })
      }
      console.log("Creating user in team:", { userId, username, teamId, role })
      return UsersOfTeam.create({ userId, username, teamId, role })
    })

    await Promise.all(userPromises)
    console.log('Users added to team successfully')
    return res.status(200).json({ message: 'Users added to team successfully' })
  } catch (error) {
    console.error('Error adding users to team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
    addUsersToTeam
}