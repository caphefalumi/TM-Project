// src/server/routes/users.js
// This file handles responsibilities related to users in the application
// 1. Adding users to a team
// 2. Retrieving user's team data

import connectDB from '../config/db.js'
import { createTeamMemberAddedNotification } from '../scripts/notificationsService.js'

import Tasks, { TaskSubmissions } from '../models/Tasks.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'

const addUsersToTeam = async (req, res) => {
  // Add users to a team
  await connectDB()
  const { users, addedByUserId } = req.body // Expect addedByUserId to track who added the users
  console.log(users)
  if (!users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'Team ID and users array are required' })
  }

  try {
    const addedUsers = []

    for (const user of users) {
      const { teamId, userId, username, role } = user
      if (!teamId || !userId || !username || !role) {
        throw new Error('TeamId, User ID, username, and role are required for each user')
      }

      // Check that no duplicate userId is added to the same team
      const existingUser = await UsersOfTeam.findOne({ userId, teamId })
      if (existingUser) {
        console.log(`User with ID ${userId} is already added to team ${teamId}`)
        continue // Skip this user but continue with others
      }

      // Check there is a team with the given teamId
      const teamExists = await Teams.exists({ _id: teamId })
      if (!teamExists) {
        console.log(`Team with ID ${teamId} does not exist`)
        return res.status(404).json({ message: `Team with ID ${teamId} does not exist` })
      }

      console.log('Creating user in team:', { userId, username, teamId, role })
      const newUserOfTeam = await UsersOfTeam.create({ userId, username, teamId, role })
      addedUsers.push({ userId, teamId, username })

      // Create notification for the added user (if not adding themselves)
      if (addedByUserId && userId !== addedByUserId) {
        try {
          await createTeamMemberAddedNotification(userId, teamId, addedByUserId)
          console.log(`Notification created for user ${userId} being added to team ${teamId}`)
        } catch (notificationError) {
          console.error('Error creating team member added notification:', notificationError)
          // Don't fail the user addition if notification creation fails
        }
      }
    }

    console.log('Users added to team successfully')
    return res.status(200).json({
      message: 'Users added to team successfully',
      addedUsers: addedUsers.length,
      details: addedUsers,
    })
  } catch (error) {
    console.error('Error adding users to team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getUsersOfTeam = async (req, res) => {
  // Get all users of a team by team ID
  // Returns an array of users with their userId, username, and email
  await connectDB()
  const { teamId } = req.params
  if (!teamId) {
    return res.status(400).json({ message: 'Team ID is required' })
  }
  try {
    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: `Team with ID ${teamId} does not exist` })
    }

    const users = await UsersOfTeam.find({ teamId }).select('userId username role')
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found for this team' })
    }

    return res.status(200).json(users)
  } catch (error) {
    console.error('Error fetching users of team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteUsersFromTeam = async (req, res) => {
  // Delete users from a team by user ID and team ID
  // Also delete all tasks and submissions associated with the user in the team
  // Returns a success message if users are deleted successfully
  // Requires an array of userID and teamID in the request body
  await connectDB()
  const membersToRemove = req.body
  if (!membersToRemove || !Array.isArray(membersToRemove)) {
    console.log('Users array is required', membersToRemove)
    return res.status(400).json({ error: 'Users array is required' })
  }
  try {
    const deletePromises = membersToRemove.map(async (user) => {
      const { userId, teamId } = user
      if (!userId || !teamId) {
        throw new Error('User ID and team ID are required for each user')
      }

      // Check if the user exists in the team
      const existingUser = await UsersOfTeam.findOne({ userId, teamId })
      if (!existingUser) {
        console.log(`User with ID ${userId} not found in team ${teamId}`)
        return res
          .status(404)
          .json({ message: `User with ID ${userId} not found in team ${teamId}` })
      }
      // Delete all tasks and submissions associated with the user in the team
      await Tasks.deleteMany({ userId, teamId })
      await TaskSubmissions.deleteMany({ userId, teamId })

      return UsersOfTeam.deleteOne({ userId, teamId })
    })
    // If any delete operation fails, it will throw an error
    await Promise.all(deletePromises)
    console.log('Users deleted from team successfully')
    return res.status(200).json({ message: 'Users deleted from team successfully' })
  } catch (error) {
    console.error('Error deleting users from team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
}
