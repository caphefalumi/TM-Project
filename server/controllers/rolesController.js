import Role from '../models/Role.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import { ROLES } from '../middleware/roleMiddleware.js'

// Create a new custom role for a team
export const createRole = async (req, res) => {
  try {
    const { teamId } = req.params
    const { name, permissions, icon, color } = req.body

    if (!name || !Array.isArray(permissions)) {
      return res.status(400).json({
        message: 'Role name and permissions array are required',
      })
    }

    // Check if role name already exists in this team
    const existingRole = await Role.findOne({ team_id: teamId, name })
    if (existingRole) {
      return res.status(400).json({
        message: 'Role name already exists in this team',
      })
    }

    const newRole = new Role({
      name,
      team_id: teamId,
      permissions,
      icon: icon || 'mdi-star',
      color: color || 'purple',
    })

    await newRole.save()

    res.status(201).json({
      message: 'Role created successfully',
      role: newRole,
    })
  } catch (error) {
    console.log('Error creating role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get all custom roles for a team
export const getRolesByTeam = async (req, res) => {
  try {
    const { teamId } = req.params

    const roles = await Role.find({ team_id: teamId }).sort({ createdAt: -1 })

    res.status(200).json({
      message: 'Roles retrieved successfully',
      roles,
    })
  } catch (error) {
    console.log('Error getting roles:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get a specific role by ID
export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params

    const role = await Role.findById(roleId)
    if (!role) {
      return res.status(404).json({ message: 'Role not found' })
    }

    res.status(200).json({
      message: 'Role retrieved successfully',
      role,
    })
  } catch (error) {
    console.log('Error getting role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Update a custom role
export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params
    const { name, permissions, icon, color } = req.body

    const role = await Role.findById(roleId)
    if (!role) {
      return res.status(404).json({ message: 'Role not found' })
    }

    // Check if new name conflicts with existing roles in the same team
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        team_id: role.team_id,
        name,
        _id: { $ne: roleId },
      })
      if (existingRole) {
        return res.status(400).json({
          message: 'Role name already exists in this team',
        })
      }
    }

    // Update fields
    if (name) role.name = name
    if (Array.isArray(permissions)) role.permissions = permissions
    if (icon) role.icon = icon
    if (color) role.color = color

    await role.save()

    res.status(200).json({
      message: 'Role updated successfully',
      role,
    })
  } catch (error) {
    console.log('Error updating role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Delete a custom role
export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params

    const role = await Role.findById(roleId)
    if (!role) {
      return res.status(404).json({ message: 'Role not found' })
    }

    // Find users assigned to this role and reassign them to Member
    const usersWithRole = await UsersOfTeam.find({ roleId: roleId })

    if (usersWithRole.length > 0) {
      // Reassign all users with this custom role to Member role
      await UsersOfTeam.updateMany(
        { roleId: roleId },
        {
          roleType: ROLES.MEMBER,
          roleId: null,
          customPermissions: {}, // Clear any custom permissions
        },
      )
    }

    await Role.findByIdAndDelete(roleId)

    res.status(200).json({
      message: 'Role deleted successfully',
      reassignedUsers: usersWithRole.length,
    })
  } catch (error) {
    console.log('Error deleting role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Assign custom role to user
export const assignCustomRoleToUser = async (req, res) => {
  try {
    const { teamId, userId } = req.params
    const { roleId, roleType } = req.body
    const requestingUserId = req.user.userId

    if (!roleType) {
      return res.status(400).json({ message: 'Role type is required' })
    }

    if (requestingUserId === userId) {
      return res.status(403).json({
        message: 'You cannot change your own role. Only other team members can change your role.',
      })
    }

    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    if (!userTeamRole) {
      return res.status(404).json({ message: 'User not found in team' })
    }

    if (roleType === ROLES.CUSTOM) {
      if (!roleId) {
        return res.status(400).json({ message: 'Custom role ID is required for custom roles' })
      }
      const customRole = await Role.findById(roleId)
      if (!customRole || customRole.team_id.toString() !== teamId) {
        return res.status(404).json({ message: 'Custom role not found' })
      }
    }

    // Multiple admins are now allowed - no auto-demotion logic needed
    let demotedAdmin = null

    const updateData = {
      roleType,
      roleId: roleType === ROLES.CUSTOM ? roleId : null,
    }

    if (roleType !== ROLES.CUSTOM) {
      updateData.customPermissions = {}
    }

    await UsersOfTeam.findOneAndUpdate({ userId, teamId }, updateData, { new: true })
    res.status(200).json({
      message: 'Role assigned successfully',
      userId,
      teamId,
      roleType,
      customRoleId: roleType === ROLES.CUSTOM ? roleId : null,
      demotedAdmin: demotedAdmin,
    })
  } catch (error) {
    console.log('Error assigning custom role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
