// src/server/routes/users.js
// This file handles responsibilities related to users in the application
// 1. Adding users to a team
// 2. Retrieving user's team data

import { createTeamMemberAddedNotification } from '../scripts/notificationsService.js'
import Account from '../models/Account.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Role from '../models/Role.js'
import { PERMISSIONS } from '../config/permissions.js'
import { ROLES, getUserCustomPermissions, getRoleDefaultPermissions } from '../verify/RoleAuth.js'

export const getAllUsers = async (req, res) => {
  // Returns all users in the database by array

  try {
    const users = await Account.find({}, 'username _id').exec()
    // Find all users and return only username and _id
    if (!users || users.length === 0) {
      console.log('No users found')
      return res.status(404).json({ error: 'No users found' })
    }
    // console.log('Users:', users)
    return res.status(200).json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
export const addUsersToTeam = async (req, res) => {
  // Add users to a team

  const { users, addedByUserId } = req.body // Expect addedByUserId to track who added the users
  console.log(users)
  if (!users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'Team ID and users array are required' })
  }

  try {
    const addedUsers = []

    for (const user of users) {
      const { teamId, userId, username, role, roleId } = user
      if (!teamId || !userId || !username || !role) {
        console.log('Missing required fields for user:', user)
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

      // Prepare user data for creation
      const userData = { userId, username, teamId, role }
      
      // If roleId is provided, validate it exists and belongs to the team
      if (roleId) {
        const customRole = await Role.findOne({ _id: roleId, team_id: teamId })
        if (!customRole) {
          console.log(`Custom role ${roleId} not found for team ${teamId}`)
          return res.status(400).json({ message: `Invalid custom role for team` })
        }
        userData.role_id = roleId
      }

      console.log('Creating user in team:', userData)
      const newUserOfTeam = await UsersOfTeam.create(userData)
      addedUsers.push({ userId, teamId, username, role, customRole: roleId ? true : false })

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

export const getUsersOfTeam = async (req, res) => {
  // Get all users of a team by team ID
  // Returns an array of users with their userId, username, role, and custom role information

  const { teamId } = req.params
  if (!teamId) {
    return res.status(400).json({ message: 'Team ID is required' })
  }
  try {
    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: `Team with ID ${teamId} does not exist` })
    }

    const users = await UsersOfTeam.find({ teamId })
      .select('userId username role role_id')
      .populate('role_id', 'name permissions')
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found for this team' })
    }

    // Transform the data to include custom role information
    const transformedUsers = users.map(user => ({
      userId: user.userId,
      username: user.username,
      role: user.role, // Default role (Admin/Moderator/Member)
      customRole: user.role_id ? {
        id: user.role_id._id,
        name: user.role_id.name,
        permissions: user.role_id.permissions
      } : null
    }))

    return res.status(200).json(transformedUsers)
  } catch (error) {
    console.error('Error fetching users of team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteUsersFromTeam = async (req, res) => {
  // Delete users from a team by user ID and team ID
  // Also delete all tasks and submissions associated with the user in the team
  // Returns a success message if users are deleted successfully
  // Expects teamId in URL params and array of user objects in request body

  const { teamId } = req.params
  const membersToRemove = req.body
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required in URL parameters' })
  }
  
  if (!membersToRemove || !Array.isArray(membersToRemove)) {
    console.log('Users array is required', membersToRemove)
    return res.status(400).json({ error: 'Users array is required' })
  }
  
  try {
    // Validate all users first
    for (const user of membersToRemove) {
      const { userId } = user
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required for each user' })
      }

      // Check if the user exists in the team
      const existingUser = await UsersOfTeam.findOne({ userId, teamId })
      if (!existingUser) {
        console.log(`User with ID ${userId} not found in team ${teamId}`)
        return res.status(404).json({ message: `User with ID ${userId} not found in team ${teamId}` })
      }
    }

    // If all validations pass, proceed with deletions
    const deletePromises = membersToRemove.map(async (user) => {
      const { userId } = user
      
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


export const changeUserRole = async (req, res) => {
  try {
    const { teamId, userId } = req.params
    const { role, newRole, roleId } = req.body
    const requestingUserId = req.user.userId

    // Support both 'role' and 'newRole' for backward compatibility
    const targetRole = role || newRole

    if (!targetRole) {
      return res.status(400).json({ message: 'Role is required' })
    }

    // If it's not a standard role, validate the custom role
    if (!Object.values(ROLES).includes(targetRole) && !roleId) {
      return res.status(400).json({
        message: 'Invalid role or missing custom role ID',
        validRoles: Object.values(ROLES)
      })
    }

    // Check if target user exists in team
    const targetUser = await UsersOfTeam.findOne({ userId, teamId })
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found in team' })
    }

    // If assigning a custom role, validate it exists and belongs to the team
    if (roleId) {
      const customRole = await Role.findById(roleId)
      if (!customRole || customRole.team_id.toString() !== teamId) {
        return res.status(404).json({ message: 'Custom role not found or does not belong to this team' })
      }
    }

    // Prevent self-demotion of last admin
    if (requestingUserId === userId && targetUser.role === 'Admin' && targetRole !== 'Admin') {
      const adminCount = await UsersOfTeam.countDocuments({ teamId, role: 'Admin' })
      if (adminCount === 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin of the team' })
      }
    }

    // Update the role and custom role assignment
    const updatedUser = await UsersOfTeam.findOneAndUpdate(
      { userId, teamId },
      { 
        role: targetRole,
        role_id: roleId || null,
        // Reset custom permissions when changing roles
        customPermissions: {}
      },
      { new: true }
    ).populate('role_id')

    res.status(200).json({
      message: 'Role updated successfully',
      user: {
        userId: updatedUser.userId,
        role: updatedUser.role,
        customRole: updatedUser.role_id ? {
          id: updatedUser.role_id._id,
          name: updatedUser.role_id.name,
          icon: updatedUser.role_id.icon,
          color: updatedUser.role_id.color
        } : null
      }
    })
  } catch (error) {
    console.error('Error changing user role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Get user's permissions in a team
 */
export const getUserPermissions = async (req, res) => {
  try {
    const { teamId, userId } = req.params
    const requestingUsername = req.user.username

    // Get user's custom permissions (role + custom permissions)
    const customPermissions = await getUserCustomPermissions(userId, teamId)
    if (!customPermissions) {
      return res.status(404).json({ message: 'User not found in team' })
    }

    // Add global admin flag
    customPermissions.isGlobalAdmin = requestingUsername === 'admin'

    console.log('User permissions:', { userId, teamId, permissions: customPermissions })
    res.status(200).json(customPermissions)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Update user's custom permissions in a team
 * Only admins can update custom permissions
 */
export const updateUserPermissions = async (req, res) => {
  try {
    const { teamId, userId } = req.params
    const { customPermissions } = req.body

    // Check if target user exists in team
    const targetUser = await UsersOfTeam.findOne({ userId, teamId })
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found in team' })
    }

    // Use centralized permission validation
    const validPermissions = Object.values(PERMISSIONS)

    const invalidPermissions = Object.keys(customPermissions).filter(
      perm => !validPermissions.includes(perm)
    )

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        message: 'Invalid permissions',
        invalidPermissions,
        validPermissions
      })
    }

    // Update custom permissions
    await UsersOfTeam.findOneAndUpdate(
      { userId, teamId },
      { customPermissions },
      { new: true }
    )

    res.status(200).json({
      message: 'Permissions updated successfully',
      userId,
      teamId,
      customPermissions
    })
  } catch (error) {
    console.error('Error updating user permissions:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Get default permissions for a role (for UI reference)
 */
export const getRoleDefaultPermissionsAPI = async (req, res) => {
  try {
    const { role } = req.params

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        message: 'Invalid role',
        validRoles: Object.values(ROLES)
      })
    }

    const defaultPermissions = getRoleDefaultPermissions(role)
    res.status(200).json(defaultPermissions)
  } catch (error) {
    console.error('Error getting role default permissions:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  getAllUsers,
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
  getRoleDefaultPermissions,
}
