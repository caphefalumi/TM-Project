import connectDB from '../config/db.js'
import mongoose from 'mongoose'

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
    const userPromises = users.map((user) => {
      const { teamId, userId, username, role } = user
      if (!teamId || !userId || !username || !role) {
        throw new Error('TeamId, User ID, username, and role are required for each user')
      }
      // Check that no duplicate userId is added to the same team
      const existingUser = UsersOfTeam.findOne({ userId, teamId })
      if (existingUser) {
        throw new Error(`User with ID ${userId} is already added to team ${teamId}`)
      }
      return UsersOfTeam.create({ userId, username, teamId, role })
    })

    await Promise.all(userPromises)
    return res.status(200).json({ success: 'Users added to team successfully' })
  } catch (error) {
    console.error('Error adding users to team:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default {
    addUsersToTeam
}