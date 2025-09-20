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
import JWTAuth from '../verify/JWTAuth.js'
import RefreshToken from '../models/RefreshToken.js'

const { generateAccessToken, generateRefreshToken } = JWTAuth

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
  const { users } = req.body
  const requestingUserId = req.user.userId // always trust JWT-authenticated user

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'Users array is required' })
  }

  try {
    const { teamId } = users[0] // all users have same teamId
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' })
    }

    // Check team exists
    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: `Team with ID ${teamId} does not exist` })
    }

    // Check if requesting user is admin in this team or global admin
    const requesterInTeam = await UsersOfTeam.findOne({ userId: requestingUserId, teamId })
    const isRequestingUserAdmin =
      requesterInTeam?.role === 'Admin' || req.user?.username === 'admin'

    const addedUsers = []
    const usersToInsert = []

    for (const user of users) {
      const { userId, username, roleId } = user
      if (!userId || !username) {
        console.log('Missing required fields for user:', user)
        continue
      }

      // Skip duplicate members
      const existingUser = await UsersOfTeam.findOne({ userId, teamId })
      if (existingUser) {
        console.log(`User with ID ${userId} already in team ${teamId}`)
        continue
      }

      // Determine actual role
      let actualRole = 'Member'
      let actualRoleId = null

      if (isRequestingUserAdmin && roleId) {
        if (roleId === 'Admin' || roleId === 'Member') {
          actualRole = roleId
        } else {
          // custom role
          const customRole = await Role.findOne({ _id: roleId, team_id: teamId })
          if (!customRole) {
            console.log(`Custom role ${roleId} not found for team ${teamId}`)
            return res.status(400).json({ message: `Invalid custom role for team` })
          }
          actualRole = customRole.name
          actualRoleId = roleId
        }
      }

      // Prepare data for bulk insert
      usersToInsert.push({
        userId,
        username,
        teamId,
        role: actualRole,
        role_id: actualRoleId,
      })

      addedUsers.push({
        userId,
        teamId,
        username,
        role: actualRole,
        customRole: !!actualRoleId,
        addedByAdmin: isRequestingUserAdmin,
      })

      // Notification (async, don’t block)
      if (userId !== requestingUserId) {
        createTeamMemberAddedNotification(userId, teamId, requestingUserId)
          .then(() => console.log(`Notification sent for ${userId}`))
          .catch((err) => console.error('Notification error:', err))
      }
    }

    // Bulk insert
    if (usersToInsert.length > 0) {
      await UsersOfTeam.insertMany(usersToInsert)
    }

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
      .populate('role_id', 'name permissions icon color')

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found for this team' })
    }

    // Transform the data to include custom role information
    const transformedUsers = users.map((user) => ({
      userId: user.userId,
      username: user.username,
      role: user.role, // Default role (Admin/Member)
      customRole: user.role_id
        ? {
            id: user.role_id._id,
            name: user.role_id.name,
            permissions: user.role_id.permissions,
            icon: user.role_id.icon,
            color: user.role_id.color,
          }
        : null,
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
        return res
          .status(404)
          .json({ message: `User with ID ${userId} not found in team ${teamId}` })
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

    // Prevent users from changing their own role
    if (requestingUserId === userId) {
      return res.status(403).json({
        message: 'You cannot change your own role. Only other team members can change your role.',
      })
    }

    // If it's not a standard role, validate the custom role
    if (!Object.values(ROLES).includes(targetRole) && !roleId) {
      return res.status(400).json({
        message: 'Invalid role or missing custom role ID',
        validRoles: Object.values(ROLES),
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
        return res
          .status(404)
          .json({ message: 'Custom role not found or does not belong to this team' })
      }
    }

    // Prevent self-demotion if user is the last admin (safety check)
    if (requestingUserId === userId && targetUser.role === 'Admin' && targetRole !== 'Admin') {
      const adminCount = await UsersOfTeam.countDocuments({ teamId, role: 'Admin' })
      if (adminCount === 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin of the team' })
      }
    }

    // Multiple admins are now allowed - no auto-demotion logic needed
    let demotedAdmin = null

    // Update the role and custom role assignment
    const updateData = {
      role: targetRole,
      role_id: roleId || null,
    }

    // Only reset custom permissions when changing to a standard role (no custom role assigned)
    // Keep individual permission overrides when assigning custom roles
    if (!roleId) {
      updateData.customPermissions = {}
    }

    const updatedUser = await UsersOfTeam.findOneAndUpdate({ userId, teamId }, updateData, {
      new: true,
    }).populate('role_id')

    res.status(200).json({
      message: 'Role updated successfully',
      user: {
        userId: updatedUser.userId,
        role: updatedUser.role,
        customRole: updatedUser.role_id
          ? {
              id: updatedUser.role_id._id,
              name: updatedUser.role_id.name,
              icon: updatedUser.role_id.icon,
              color: updatedUser.role_id.color,
            }
          : null,
      },
      demotedAdmin: demotedAdmin,
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

    // Check if requesting user is global admin first
    if (requestingUsername === 'admin') {
      // Global admin gets all permissions regardless of team membership
      const allPermissions = getRoleDefaultPermissions('Admin')
      const globalAdminPermissions = {
        role: 'Admin',
        customRoleName: null,
        ...allPermissions,
        isGlobalAdmin: true,
      }
      console.log('Global admin permissions granted:', {
        userId,
        teamId,
        permissions: globalAdminPermissions,
      })
      return res.status(200).json(globalAdminPermissions)
    }

    // Get user's custom permissions (role + custom permissions)
    const customPermissions = await getUserCustomPermissions(userId, teamId)
    if (!customPermissions) {
      return res.status(404).json({ message: 'User not found in team' })
    }

    // Add global admin flag
    customPermissions.isGlobalAdmin = false

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
      (perm) => !validPermissions.includes(perm),
    )

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        message: 'Invalid permissions',
        invalidPermissions,
        validPermissions,
      })
    }

    // Update custom permissions
    await UsersOfTeam.findOneAndUpdate({ userId, teamId }, { customPermissions }, { new: true })

    res.status(200).json({
      message: 'Permissions updated successfully',
      userId,
      teamId,
      customPermissions,
    })
  } catch (error) {
    console.error('Error updating user permissions:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateUserProfile = async (req, res) => {
  try {
    const requestingUserId = req.user.userId // from JWT token
    let { username, email } = req.body

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' })
    }

    username = username.toLowerCase()
    email = email.toLowerCase()

    // Check if username already exists (excluding current user)
    const existingUser = await Account.findOne({
      username,
      _id: { $ne: requestingUserId },
    })
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Check if email already exists (excluding current user)
    const existingEmail = await Account.findOne({
      email,
      _id: { $ne: requestingUserId },
    })
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    // Update the user profile
    const updatedUser = await Account.findByIdAndUpdate(
      requestingUserId,
      { username, email },
      { new: true, runValidators: true },
    ).select('_id username email')

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Also update username in all team memberships
    await UsersOfTeam.updateMany({ userId: requestingUserId }, { username: username })

    // Generate new tokens with updated user data
    const newUserData = {
      userId: updatedUser._id.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
    }

    const newAccessToken = generateAccessToken(newUserData)
    const newRefreshToken = generateRefreshToken(newUserData)

    // Update refresh token in database
    await RefreshToken.findOneAndUpdate(
      { userId: requestingUserId },
      {
        token: newRefreshToken,
        updatedAt: new Date(),
      },
      { new: true },
    )

    // Set new cookies
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    })

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 20 * 60 * 1000, // 20 minutes
      path: '/',
    })

    console.log('Updated username in team memberships and renewed tokens', {
      userId: requestingUserId,
      username,
      email,
    })

    res.status(200).json({
      success: 'Profile updated successfully',
      user: {
        userId: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
      },
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteUserAccount = async (req, res) => {
  try {
    const requestingUserId = req.user.userId // from JWT token

    // Find the user first
    const user = await Account.findById(requestingUserId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Remove user from all teams
    await UsersOfTeam.deleteMany({ userId: requestingUserId })

    // Delete user's task submissions
    await TaskSubmissions.deleteMany({ userId: requestingUserId })

    // Remove user from any custom roles they might have created
    await Role.deleteMany({ created_by: requestingUserId })

    // Finally delete the user account
    await Account.findByIdAndDelete(requestingUserId)

    res.status(200).json({
      success: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    res.status(500).json({ error: 'Internal server error' })
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
  updateUserProfile,
  deleteUserAccount,
}
