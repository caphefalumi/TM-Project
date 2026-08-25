import Role from './role.model.js'
import UsersOfTeam from '../teams/team-membership.model.js'
import { ROLES } from './role.middleware.js'

export type RoleServiceError = Error & {
  status: number
  body: Record<string, unknown>
}

const serviceError = (status: number, body: Record<string, unknown>): RoleServiceError => {
  return Object.assign(new Error(String(body.message || 'Role service error')), { status, body })
}

export const isRoleServiceError = (error: unknown): error is RoleServiceError => {
  return (
    error instanceof Error &&
    typeof (error as RoleServiceError).status === 'number' &&
    typeof (error as RoleServiceError).body === 'object'
  )
}

export const createRole = async (
  teamId: string,
  input: { name?: string; permissions?: string[]; icon?: string; color?: string },
) => {
  const { name, permissions, icon, color } = input
  if (!name || !Array.isArray(permissions)) {
    throw serviceError(400, { message: 'Role name and permissions array are required' })
  }

  const existingRole = await Role.findOne({ team_id: teamId, name })
  if (existingRole) {
    throw serviceError(400, { message: 'Role name already exists in this team' })
  }

  const newRole = new Role({
    name,
    team_id: teamId,
    permissions,
    icon: icon || 'mdi-star',
    color: color || 'purple',
  })
  await newRole.save()

  return {
    message: 'Role created successfully',
    role: newRole,
  }
}

export const getRolesByTeam = async (teamId: string) => {
  const roles = await Role.find({ team_id: teamId }).sort({ createdAt: -1 })
  return {
    message: 'Roles retrieved successfully',
    roles,
  }
}

export const getRoleById = async (roleId: string) => {
  const role = await Role.findById(roleId)
  if (!role) {
    throw serviceError(404, { message: 'Role not found' })
  }

  return {
    message: 'Role retrieved successfully',
    role,
  }
}

export const updateRole = async (
  roleId: string,
  input: { name?: string; permissions?: string[]; icon?: string; color?: string },
) => {
  const { name, permissions, icon, color } = input
  const role = await Role.findById(roleId)
  if (!role) {
    throw serviceError(404, { message: 'Role not found' })
  }

  if (name && name !== role.name) {
    const existingRole = await Role.findOne({
      team_id: role.team_id,
      name,
      _id: { $ne: roleId },
    })
    if (existingRole) {
      throw serviceError(400, { message: 'Role name already exists in this team' })
    }
  }

  if (name) role.name = name
  if (Array.isArray(permissions)) role.permissions = permissions as any
  if (icon) role.icon = icon
  if (color) role.color = color
  await role.save()

  return {
    message: 'Role updated successfully',
    role,
  }
}

export const deleteRole = async (roleId: string) => {
  const role = await Role.findById(roleId)
  if (!role) {
    throw serviceError(404, { message: 'Role not found' })
  }

  const usersWithRole = await UsersOfTeam.find({ roleId })
  if (usersWithRole.length > 0) {
    await UsersOfTeam.updateMany(
      { roleId },
      {
        roleType: ROLES.MEMBER,
        roleId: null,
        customPermissions: {},
      },
    )
  }
  await Role.findByIdAndDelete(roleId)

  return {
    message: 'Role deleted successfully',
    reassignedUsers: usersWithRole.length,
  }
}

export const assignCustomRoleToUser = async (
  teamId: string,
  userId: string,
  requestingUserId: string,
  input: { roleId?: string; roleType?: string },
) => {
  const { roleId, roleType } = input
  if (!roleType) {
    throw serviceError(400, { message: 'Role type is required' })
  }
  if (requestingUserId === userId) {
    throw serviceError(403, {
      message: 'You cannot change your own role. Only other team members can change your role.',
    })
  }

  const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
  if (!userTeamRole) {
    throw serviceError(404, { message: 'User not found in team' })
  }

  if (roleType === ROLES.CUSTOM) {
    if (!roleId) {
      throw serviceError(400, { message: 'Custom role ID is required for custom roles' })
    }
    const customRole = await Role.findById(roleId)
    if (!customRole || customRole.team_id.toString() !== teamId) {
      throw serviceError(404, { message: 'Custom role not found' })
    }
  }

  const updateData: Record<string, unknown> = {
    roleType,
    roleId: roleType === ROLES.CUSTOM ? roleId : null,
  }
  if (roleType !== ROLES.CUSTOM) {
    updateData.customPermissions = {}
  }

  await UsersOfTeam.findOneAndUpdate({ userId, teamId }, updateData, { new: true })
  return {
    message: 'Role assigned successfully',
    userId,
    teamId,
    roleType,
    customRoleId: roleType === ROLES.CUSTOM ? roleId : null,
    demotedAdmin: null,
  }
}
