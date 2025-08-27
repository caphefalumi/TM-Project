import Role from '../models/Role.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import { AVAILABLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../config/permissions.js'

// Create a new custom role for a team
export const createRole = async (req, res) => {
  try {
    const { teamId } = req.params
    const { name, permissions, icon, color } = req.body

    if (!name || !Array.isArray(permissions)) {
      return res.status(400).json({ 
        message: 'Role name and permissions array are required' 
      })
    }

    // Check if role name already exists in this team
    const existingRole = await Role.findOne({ team_id: teamId, name })
    if (existingRole) {
      return res.status(400).json({ 
        message: 'Role name already exists in this team' 
      })
    }

    const newRole = new Role({
      name,
      team_id: teamId,
      permissions,
      icon: icon || 'mdi-star',
      color: color || 'purple'
    })

    await newRole.save()

    res.status(201).json({
      message: 'Role created successfully',
      role: newRole
    })
  } catch (error) {
    console.error('Error creating role:', error)
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
      roles
    })
  } catch (error) {
    console.error('Error getting roles:', error)
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
      role
    })
  } catch (error) {
    console.error('Error getting role:', error)
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
        _id: { $ne: roleId }
      })
      if (existingRole) {
        return res.status(400).json({ 
          message: 'Role name already exists in this team' 
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
      role
    })
  } catch (error) {
    console.error('Error updating role:', error)
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

    // Check if any users are assigned to this role
    const usersWithRole = await UsersOfTeam.find({ role_id: roleId })
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete role. Users are still assigned to this role.',
        assignedUsers: usersWithRole.length
      })
    }

    await Role.findByIdAndDelete(roleId)

    res.status(200).json({
      message: 'Role deleted successfully'
    })  } catch (error) {
    console.error('Error deleting role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get available permissions for UI
export const getAvailablePermissions = async (req, res) => {
  try {
    res.status(200).json({
      message: 'Available permissions retrieved successfully',
      permissions: AVAILABLE_PERMISSIONS
    })
  } catch (error) {
    console.error('Error getting available permissions:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Assign custom role to user
export const assignCustomRoleToUser = async (req, res) => {
  try {
    const { teamId, userId } = req.params
    const { roleId, role } = req.body

    // Validate input
    if (!role) {
      return res.status(400).json({ message: 'Role is required' })
    }

    // Check if user exists in team
    const userTeamRole = await UsersOfTeam.findOne({ userId, teamId })
    if (!userTeamRole) {
      return res.status(404).json({ message: 'User not found in team' })
    }

    // If assigning a custom role, validate it exists
    if (roleId) {
      const customRole = await Role.findById(roleId)
      if (!customRole || customRole.team_id.toString() !== teamId) {
        return res.status(404).json({ message: 'Custom role not found' })
      }
    }

    // Update user's role assignment
    await UsersOfTeam.findOneAndUpdate(
      { userId, teamId },
      { 
        role,
        role_id: roleId || null,
        // Clear custom permissions when assigning a new role
        customPermissions: {}
      },
      { new: true }
    )

    res.status(200).json({
      message: 'Role assigned successfully',
      userId,
      teamId,
      role,
      customRoleId: roleId
    })
  } catch (error) {
    console.error('Error assigning custom role:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}