// src/server/routes/users.js
// This file handles responsibilities related to users in the application
// 1. Adding users to a team
// 2. Retrieving user's team data

import crypto from 'crypto'
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
import sendEmail from '../scripts/mailer.js'

const { generateAccessToken, generateRefreshToken } = JWTAuth

const USERNAME_LOCK_DURATION = 14 * 24 * 60 * 60 * 1000
const EMAIL_LOCK_DURATION = 90 * 24 * 60 * 60 * 1000
const EMAIL_VERIFICATION_EXPIRATION = 24 * 60 * 60 * 1000
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

export const getAuthenticatedUser = async (req, res) => {
  try {
    const account = await Account.findById(req.user.userId).select(
      '_id username email emailVerified pendingEmail lastUsernameChangeAt lastEmailChangeAt emailVerificationExpires',
    )

    if (!account) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.status(200).json({
      user: {
        userId: account._id.toString(),
        username: account.username,
        email: account.email,
        emailVerified: account.emailVerified,
        pendingEmail: account.pendingEmail,
        lastUsernameChangeAt: account.lastUsernameChangeAt,
        lastEmailChangeAt: account.lastEmailChangeAt,
        emailVerificationExpires: account.emailVerificationExpires,
      },
      success: 'User data retrieved successfully',
    })
  } catch (error) {
    console.error('Error retrieving authenticated user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

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
      .select('userId role role_id')
      .populate('role_id', 'name permissions icon color')

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found for this team' })
    }

    // Get unique user IDs to fetch usernames
    const userIds = users.map((user) => user.userId)

    // Fetch user accounts to get usernames
    const accounts = await Account.find({ _id: { $in: userIds } }, { _id: 1, username: 1 })

    // Create a mapping from userId to username
    const userIdToUsername = {}
    accounts.forEach((account) => {
      userIdToUsername[account._id.toString()] = account.username
    })

    // Transform the data to include username and custom role information
    const transformedUsers = users.map((user) => ({
      userId: user.userId,
      username: userIdToUsername[user.userId] || 'Unknown User',
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
    const requestingUserId = req.user.userId
    let { username, email } = req.body

    // Only require username if it's being changed, and only require email if it's being changed
    if ((username !== undefined && !username.trim()) || (email !== undefined && !email.trim())) {
      return res.status(400).json({ error: 'Field cannot be empty' })
    }

    // If neither field is present, reject
    if (username === undefined && email === undefined) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    username = username !== undefined ? username.trim() : undefined
    email = email !== undefined ? email.trim() : undefined

    const account = await Account.findById(requestingUserId)
    if (!account) {
      return res.status(404).json({ error: 'User not found' })
    }

    const normalizedUsername = username
    const normalizedEmail = email !== undefined ? email.toLowerCase() : account.email

    const usernameChanged = username !== undefined && normalizedUsername !== account.username
    const emailChanged = email !== undefined && normalizedEmail !== account.email
    const reissueVerification =
      !emailChanged && account.pendingEmail && account.pendingEmail === normalizedEmail

    if (!usernameChanged && !emailChanged && !reissueVerification) {
      const usernameCooldownEndsAt =
        account.lastUsernameChangeAt &&
        new Date(account.lastUsernameChangeAt.getTime() + USERNAME_LOCK_DURATION)
      const emailCooldownEndsAt =
        account.lastEmailChangeAt &&
        new Date(account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION)

      return res.status(200).json({
        message: 'No changes detected',
        user: {
          userId: account._id.toString(),
          username: account.username,
          email: account.email,
          pendingEmail: account.pendingEmail,
          emailVerified: account.emailVerified,
          lastUsernameChangeAt: account.lastUsernameChangeAt,
          lastEmailChangeAt: account.lastEmailChangeAt,
          emailVerificationExpires: account.emailVerificationExpires,
        },
        requiresEmailVerification: Boolean(account.pendingEmail),
        usernameCooldownEndsAt: usernameCooldownEndsAt
          ? usernameCooldownEndsAt.toISOString()
          : null,
        emailCooldownEndsAt: emailCooldownEndsAt ? emailCooldownEndsAt.toISOString() : null,
        emailVerificationExpiresAt: account.emailVerificationExpires,
      })
    }

    if (usernameChanged) {
      const existingUser = await Account.findOne({
        username: normalizedUsername,
        _id: { $ne: requestingUserId },
      })

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' })
      }

      if (
        account.lastUsernameChangeAt &&
        Date.now() - account.lastUsernameChangeAt.getTime() < USERNAME_LOCK_DURATION
      ) {
        const availableAt = new Date(
          account.lastUsernameChangeAt.getTime() + USERNAME_LOCK_DURATION,
        )

        return res.status(400).json({
          error: 'USERNAME_COOLDOWN',
          message: 'You can update your display name again once the lock period ends.',
          availableAt: availableAt.toISOString(),
        })
      }

      account.username = normalizedUsername
      account.lastUsernameChangeAt = new Date()
    }

    let verificationToken = null

    if (emailChanged || reissueVerification) {
      if (emailChanged) {
        const existingEmail = await Account.findOne({
          email: normalizedEmail,
          _id: { $ne: requestingUserId },
        })

        if (existingEmail) {
          return res.status(400).json({ error: 'Email already exists' })
        }

        if (
          account.lastEmailChangeAt &&
          Date.now() - account.lastEmailChangeAt.getTime() < EMAIL_LOCK_DURATION
        ) {
          const availableAt = new Date(account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION)

          return res.status(400).json({
            error: 'EMAIL_COOLDOWN',
            message: 'You can update your email address again once the lock period ends.',
            availableAt: availableAt.toISOString(),
          })
        }

        account.pendingEmail = normalizedEmail
        account.emailVerified = false
      }

      verificationToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex')
      account.emailVerificationToken = hashedToken
      account.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION)
    }

    await account.save()

    if (verificationToken) {
      const verificationTarget = account.pendingEmail
      const verificationUrl = `${CLIENT_URL}/verify-email?token=${verificationToken}`
      const mailOptions = {
        from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
        to: verificationTarget,
        subject: 'Confirm your new email address',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4A90E2; margin-bottom: 12px;">Verify your new email</h2>
            <p>We received a request to update the email on your account.</p>
            <p>Please confirm this change by clicking the button below within the next 24 hours:</p>
            <p style="text-align: center; margin: 24px 0;">
              <a href="${verificationUrl}" style="background-color: #4A90E2; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify new email address</a>
            </p>
            <p style="font-size: 14px; color: #666;">
              If you did not request this change, you can safely ignore this email and your address will remain the same.
            </p>
          </div>
        `,
      }

      try {
        await sendEmail(mailOptions)
      } catch (error) {
        console.error('Failed to send email verification:', error)
        account.emailVerificationToken = undefined
        account.emailVerificationExpires = undefined

        if (emailChanged) {
          account.pendingEmail = null
          account.emailVerified = true
        }

        await account.save()

        return res
          .status(500)
          .json({ error: 'Failed to send verification email. Please try again later.' })
      }
    }

    if (usernameChanged) {
      const newUserData = {
        userId: account._id.toString(),
        username: account.username,
        email: account.email,
      }

      const newAccessToken = generateAccessToken(newUserData)
      const newRefreshToken = generateRefreshToken(newUserData)

      await RefreshToken.findOneAndUpdate(
        { userId: requestingUserId },
        {
          token: newRefreshToken,
          updatedAt: new Date(),
        },
        { new: true },
      )

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
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      })
    }

    const usernameCooldownEndsAt =
      account.lastUsernameChangeAt &&
      new Date(account.lastUsernameChangeAt.getTime() + USERNAME_LOCK_DURATION)
    const emailCooldownEndsAt =
      account.lastEmailChangeAt &&
      new Date(account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION)

    const responseMessage = verificationToken
      ? `We've sent a verification link to ${account.pendingEmail}. Please verify within 24 hours to complete the update.`
      : 'Profile updated successfully.'

    return res.status(200).json({
      message: responseMessage,
      user: {
        userId: account._id.toString(),
        username: account.username,
        email: account.email,
        pendingEmail: account.pendingEmail,
        emailVerified: account.emailVerified,
        lastUsernameChangeAt: account.lastUsernameChangeAt,
        lastEmailChangeAt: account.lastEmailChangeAt,
        emailVerificationExpires: account.emailVerificationExpires,
      },
      requiresEmailVerification: Boolean(account.pendingEmail),
      usernameCooldownEndsAt: usernameCooldownEndsAt ? usernameCooldownEndsAt.toISOString() : null,
      emailCooldownEndsAt: emailCooldownEndsAt ? emailCooldownEndsAt.toISOString() : null,
      emailVerificationExpiresAt: account.emailVerificationExpires,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const account = await Account.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    })

    if (!account || !account.pendingEmail) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired verification token. Please request a new change.' })
    }

    const newEmail = account.pendingEmail
    account.email = newEmail
    account.pendingEmail = null
    account.emailVerificationToken = undefined
    account.emailVerificationExpires = undefined
    account.lastEmailChangeAt = new Date()
    account.emailVerified = true

    await account.save()

    await RefreshToken.updateMany(
      { userId: account._id.toString(), revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'security',
      },
    )
    const newUserData = {
      userId: account._id.toString(),
      username: account.username,
      email: newEmail,
    }
    const newAccessToken = generateAccessToken(newUserData)
    const newRefreshToken = generateRefreshToken(newUserData)

    await RefreshToken.findOneAndUpdate(
      { userId: requestingUserId },
      {
        token: newRefreshToken,
        updatedAt: new Date(),
      },
    )

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
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    })

    const emailCooldownEndsAt = new Date(
      account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION,
    ).toISOString()

    try {
      await sendEmail({
        from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
        to: newEmail,
        subject: 'Email address updated',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4A90E2; margin-bottom: 12px;">Email updated successfully</h2>
            <p>Your account email has been verified and updated to <strong>${newEmail}</strong>.</p>
            <p>If you did not authorize this change, please reset your password immediately.</p>
          </div>
        `,
      })
    } catch (error) {
      console.error('Failed to send confirmation email after verification:', error)
    }

    return res.status(200).json({
      success: 'Email verified successfully. Please sign in again to continue.',
      user: {
        userId: account._id.toString(),
        username: account.username,
        email: account.email,
        pendingEmail: account.pendingEmail,
        emailVerified: account.emailVerified,
        lastUsernameChangeAt: account.lastUsernameChangeAt,
        lastEmailChangeAt: account.lastEmailChangeAt,
        emailVerificationExpires: account.emailVerificationExpires,
      },
      emailCooldownEndsAt,
    })
  } catch (error) {
    console.error('Error verifying email change:', error)
    return res.status(500).json({ error: 'Internal server error' })
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
