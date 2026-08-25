import Account from '../auth/account.model.js'
import Tasks, { TaskSubmissions } from '../tasks/task.model.js'
import Role from '../roles/role.model.js'
import Teams from './team.model.js'
import UsersOfTeam from './team-membership.model.js'
import { createTeamMemberAddedNotification } from '../notifications/notifications.service.js'
import { PERMISSIONS, computeUserActions } from '../../shared/config/permissions.config.js'
import {
  ROLES,
  getUserCustomPermissions,
  getRoleDefaultPermissions,
  getBaseRoleFromRoleType,
  getRoleLabel,
} from '../roles/role.middleware.js'

export type TeamMembershipServiceError = Error & {
  status: number
  body: Record<string, unknown>
}

const serviceError = (
  status: number,
  body: Record<string, unknown>,
): TeamMembershipServiceError => {
  return Object.assign(
    new Error(String(body.message || body.error || 'Team membership service error')),
    { status, body },
  )
}

export const isTeamMembershipServiceError = (
  error: unknown,
): error is TeamMembershipServiceError => {
  return (
    error instanceof Error &&
    typeof (error as TeamMembershipServiceError).status === 'number' &&
    typeof (error as TeamMembershipServiceError).body === 'object'
  )
}

export const addUsersToTeam = async (
  users: any[],
  requestingUser: { userId: string; username?: string },
) => {
  if (!users || !Array.isArray(users) || users.length === 0) {
    throw serviceError(400, { error: 'Users array is required' })
  }

  const { teamId } = users[0]
  if (!teamId) {
    throw serviceError(400, { error: 'Team ID is required' })
  }

  const teamExists = await Teams.exists({ _id: teamId })
  if (!teamExists) {
    throw serviceError(404, { message: `Team with ID ${teamId} does not exist` })
  }

  const requesterInTeam = await UsersOfTeam.findOne({
    userId: requestingUser.userId,
    teamId,
  })
  const isRequestingUserAdmin =
    requesterInTeam?.roleType === ROLES.ADMIN || requestingUser.username === 'admin'
  const addedUsers: any[] = []
  const usersToInsert: any[] = []

  for (const user of users) {
    const { userId, username, roleId, roleType } = user
    if (!userId || !username) {
      console.log('Missing required fields for user:', user)
      continue
    }

    const existingUser = await UsersOfTeam.findOne({ userId, teamId })
    if (existingUser) {
      console.log(`User with ID ${userId} already in team ${teamId}`)
      continue
    }

    let assignedRoleType: string = ROLES.MEMBER
    let assignedRoleId: string | null = null
    let customRoleDoc: any = null
    const normalizedRoleType = typeof roleType === 'string' ? roleType.toLowerCase() : null

    if (isRequestingUserAdmin) {
      const fallbackRoleId = typeof roleId === 'string' ? roleId.toLowerCase() : null
      if (normalizedRoleType === ROLES.ADMIN || fallbackRoleId === ROLES.ADMIN) {
        assignedRoleType = ROLES.ADMIN
      } else if (normalizedRoleType === ROLES.MEMBER || fallbackRoleId === ROLES.MEMBER) {
        assignedRoleType = ROLES.MEMBER
      } else if (normalizedRoleType === ROLES.CUSTOM || roleId) {
        const customRole = await Role.findOne({ _id: roleId, team_id: teamId })
        if (!customRole) {
          throw serviceError(400, { message: 'Invalid custom role for team' })
        }
        assignedRoleType = ROLES.CUSTOM
        assignedRoleId = roleId
        customRoleDoc = customRole
      }
    }

    usersToInsert.push({
      userId,
      teamId,
      roleType: assignedRoleType,
      roleId: assignedRoleId,
    })
    addedUsers.push({
      userId,
      teamId,
      username,
      roleType: assignedRoleType,
      roleLabel: getRoleLabel(assignedRoleType, customRoleDoc),
      customRole: assignedRoleType === ROLES.CUSTOM,
      customRoleId: assignedRoleId,
      addedByAdmin: isRequestingUserAdmin,
    })

    if (userId !== requestingUser.userId) {
      void createTeamMemberAddedNotification(userId, teamId, requestingUser.userId)
        .then(() => console.log(`Notification sent for ${userId}`))
        .catch((error) => console.log('Notification error:', error))
    }
  }

  if (usersToInsert.length > 0) {
    await UsersOfTeam.insertMany(usersToInsert)
  }

  return {
    message: 'Users added to team successfully',
    addedUsers: addedUsers.length,
    details: addedUsers,
  }
}

export const getUsersOfTeam = async (teamId: string) => {
  if (!teamId) {
    throw serviceError(400, { message: 'Team ID is required' })
  }

  const teamExists = await Teams.exists({ _id: teamId })
  if (!teamExists) {
    throw serviceError(404, { message: `Team with ID ${teamId} does not exist` })
  }

  const users = (await UsersOfTeam.find({ teamId })
    .select('userId roleType roleId customPermissions')
    .populate('roleId', 'name permissions icon color')) as any[]
  if (users.length === 0) {
    throw serviceError(404, { message: 'No users found for this team' })
  }

  const accounts = await Account.find(
    { _id: { $in: users.map((user) => user.userId) } },
    { _id: 1, username: 1 },
  )
  const userIdToUsername: Record<string, string> = {}
  accounts.forEach((account) => {
    userIdToUsername[account._id.toString()] = account.username
  })

  return users.map((user) => {
    const baseRole = getBaseRoleFromRoleType(user.roleType)
    const roleLabel = getRoleLabel(user.roleType, user.roleId)
    return {
      userId: user.userId,
      username: userIdToUsername[user.userId.toString()] || 'Unknown User',
      roleType: user.roleType,
      baseRole,
      roleLabel,
      customRole: user.roleId
        ? {
            id: user.roleId._id,
            name: user.roleId.name,
            permissions: user.roleId.permissions,
            icon: user.roleId.icon,
            color: user.roleId.color,
          }
        : null,
      customPermissions: user.customPermissions
        ? (user.customPermissions.toObject?.() ?? user.customPermissions)
        : {},
    }
  })
}

export const deleteUsersFromTeam = async (teamId: string, membersToRemove: any[]) => {
  if (!teamId) {
    throw serviceError(400, { error: 'Team ID is required in URL parameters' })
  }
  if (!membersToRemove || !Array.isArray(membersToRemove)) {
    throw serviceError(400, { error: 'Users array is required' })
  }

  for (const user of membersToRemove) {
    const { userId } = user
    if (!userId) {
      throw serviceError(400, { message: 'User ID is required for each user' })
    }
    const existingUser = await UsersOfTeam.findOne({ userId, teamId })
    if (!existingUser) {
      throw serviceError(404, {
        message: `User with ID ${userId} not found in team ${teamId}`,
      })
    }
  }

  await Promise.all(
    membersToRemove.map(async ({ userId }) => {
      await Tasks.deleteMany({ userId, teamId })
      await TaskSubmissions.deleteMany({ userId, teamId })
      return UsersOfTeam.deleteOne({ userId, teamId })
    }),
  )
  return { message: 'Users deleted from team successfully' }
}

export const changeUserRole = async (
  teamId: string,
  userId: string,
  requestingUserId: string,
  input: any,
) => {
  const { roleType, newRoleType, roleId, role, newRole } = input
  const normalizedRoleType = (roleType || newRoleType || '').toLowerCase()
  let targetRoleType: string | null = null

  if ((Object.values(ROLES) as string[]).includes(normalizedRoleType)) {
    targetRoleType = normalizedRoleType
  } else if (typeof role === 'string' || typeof newRole === 'string') {
    const legacyRole = (role || newRole || '').toLowerCase()
    if (legacyRole === 'admin') targetRoleType = ROLES.ADMIN
    if (legacyRole === 'member') targetRoleType = ROLES.MEMBER
    if (legacyRole === 'custom') targetRoleType = ROLES.CUSTOM
  }

  if (!targetRoleType) {
    throw serviceError(400, { message: 'Role type is required' })
  }
  if (requestingUserId === userId) {
    throw serviceError(403, {
      message: 'You cannot change your own role. Only other team members can change your role.',
    })
  }
  if (targetRoleType === ROLES.CUSTOM && !roleId) {
    throw serviceError(400, {
      message: 'Custom role ID is required for custom role assignments',
      validRoles: Object.values(ROLES),
    })
  }

  const targetUser = await UsersOfTeam.findOne({ userId, teamId })
  if (!targetUser) {
    throw serviceError(404, { message: 'User not found in team' })
  }

  let customRoleDoc: any = null
  if (targetRoleType === ROLES.CUSTOM) {
    const customRole = await Role.findById(roleId)
    if (!customRole || customRole.team_id.toString() !== teamId) {
      throw serviceError(404, {
        message: 'Custom role not found or does not belong to this team',
      })
    }
    customRoleDoc = customRole
  }

  const updateData: Record<string, unknown> = {
    roleType: targetRoleType,
    roleId: targetRoleType === ROLES.CUSTOM ? roleId : null,
  }
  if (targetRoleType !== ROLES.CUSTOM) {
    updateData.customPermissions = {}
  }

  const updatedUser = (await UsersOfTeam.findOneAndUpdate(
    { userId, teamId },
    updateData,
    { new: true },
  ).populate('roleId')) as any

  return {
    message: 'Role updated successfully',
    user: {
      userId: updatedUser.userId,
      roleType: updatedUser.roleType,
      baseRole: getBaseRoleFromRoleType(updatedUser.roleType),
      roleLabel: getRoleLabel(updatedUser.roleType, updatedUser.roleId || customRoleDoc),
      customRole: updatedUser.roleId
        ? {
            id: updatedUser.roleId._id,
            name: updatedUser.roleId.name,
            icon: updatedUser.roleId.icon,
            color: updatedUser.roleId.color,
          }
        : null,
    },
    demotedAdmin: null,
  }
}

export const getUserPermissions = async (
  teamId: string,
  userId: string,
  requestingUser: { username?: string },
) => {
  if (requestingUser.username === 'admin') {
    const allPermissions = getRoleDefaultPermissions(ROLES.ADMIN)
    return {
      roleType: ROLES.ADMIN,
      baseRole: getBaseRoleFromRoleType(ROLES.ADMIN),
      roleLabel: getRoleLabel(ROLES.ADMIN, null),
      customRoleName: null,
      isGlobalAdmin: true,
      ...computeUserActions(allPermissions),
    }
  }

  const userPermissions = await getUserCustomPermissions(userId, teamId)
  if (!userPermissions) {
    throw serviceError(404, { message: 'User not found in team' })
  }

  return {
    roleType: userPermissions.roleType,
    baseRole: userPermissions.baseRole,
    roleLabel: userPermissions.roleLabel,
    customRoleName: userPermissions.customRoleName || null,
    isGlobalAdmin: false,
    ...computeUserActions(userPermissions),
  }
}

export const updateUserPermissions = async (
  teamId: string,
  userId: string,
  customPermissions: Record<string, boolean>,
) => {
  const targetUser = await UsersOfTeam.findOne({ userId, teamId })
  if (!targetUser) {
    throw serviceError(404, { message: 'User not found in team' })
  }

  const validPermissions = Object.values(PERMISSIONS)
  const invalidPermissions = Object.keys(customPermissions).filter(
    (permission) => !validPermissions.includes(permission),
  )
  if (invalidPermissions.length > 0) {
    throw serviceError(400, {
      message: 'Invalid permissions',
      invalidPermissions,
      validPermissions,
    })
  }

  await UsersOfTeam.findOneAndUpdate({ userId, teamId }, { customPermissions }, { new: true })
  return {
    message: 'Permissions updated successfully',
    userId,
    teamId,
    customPermissions,
  }
}
