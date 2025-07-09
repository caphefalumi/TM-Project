import connectDB from '../config/db.js'
import mongoose from 'mongoose'

import Account from '../models/Account.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'

const getAllUsers = async (req, res) => {
  // Returns all users in the database by array
  await connectDB()
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

const getCategories = async (req, res) => {
  // Returns an array of enum categories from the Teams schema
  await connectDB()
  try {
    const categories = Teams.schema.path('category').enumValues
    if (!categories || categories.length === 0) {
      console.log('No categories found')
      return res.status(404).json({ error: 'No categories found' })
    }
    // console.log('Categories:', categories)
    return res.status(200).json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

const getRoles = async (req, res) => {
  // Returns an array of enum roles from the UsersOfTeam schema
  await connectDB()
  try {
    const roles = UsersOfTeam.schema.path('role').enumValues
    if (!roles || roles.length === 0) {
      console.log('No roles found')
      return res.status(404).json({ error: 'No roles found' })
    }
    // console.log('Roles:', roles)
    return res.status(200).json(roles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    throw error
  }
}

const addUserToTeam = async (userId, username, teamId, role) => {
  await connectDB()
  try {
    const userOfTeam = new UsersOfTeam({
      userId,
      username,
      teamId,
      role,
    })
    // Check if the user is already in the team
    const existingUser = await UsersOfTeam.findOne({ userId, teamId })
    if (existingUser) {
      console.log(`User ${username} is already in team ${teamId} with role ${existingUser.role}`)
      return
    } else {
      await userOfTeam.save()
      console.log('User added to team:', userOfTeam)
    }
  } catch (error) {
    console.error('Error adding user to team:', error)
    throw error
  }
}

const addTeamPro = async (req, res) => {
  // Add a new team
  // This is called when user creates a new team
  // or when user creates a sub-team
  let teamId
  let resTitle = ''
  const { title, category, description, parentTeamId, userId, username } = req.body
  if (!title || !category || !description || !userId || !username) {
    return res
      .status(400)
      .json({ message: 'Title, category, description, userId, and username are required' })
  } else {
    await connectDB()
    try {
      if (!parentTeamId) {
        await addTeam(title, category, description)
      } else {
        await addSubTeam(title, category, description, parentTeamId)
      }
      // Add the user who created the team as an admin
      teamId = await Teams.findOne({ title, category, description }).select('_id')
      if (!teamId) {
        console.error('Team not found after creation:', title)
        return res.status(404).json({ message: 'Team not found' })
      } else {
        await addUserToTeam(userId, username, teamId._id, 'Admin')
        console.log('User added as Admin to the team:', teamId._id)
      }
    } catch (error) {
      console.error('Error adding team:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
  let breadCrumpTitle = await getParentsTeam(parentTeamId)
  if(breadCrumpTitle) {
    resTitle = breadCrumpTitle + ' ' + title
  } else {
    resTitle = title
  }
  res.status(200).json({ teamId: teamId._id, title: resTitle, message: 'Team created successfully' })
}

const addTeam = async (title, category, description) => {
  await connectDB()
  try {
    const team = new Teams({
      title,
      category,
      description,
    })
    await team.save()
    console.log('Team created:', team)
  } catch (error) {
    console.error('Error creating team:', error)
    throw error
  }
}

const addSubTeam = async (title, category, description, parentTeamId) => {
  await connectDB()
  // check for parentTeamId validity
  try {
    const parentTeam = await Teams.findById(parentTeamId)
    if (!parentTeam) {
      console.error('Parent team not found:', parentTeamId)
      return
    } else if (parentTeamId === 'none') {
      console.error('Sub-team cannot have "none" as parentTeamId')
      return
    } else {
      const subTeam = new Teams({
        title,
        category,
        description,
        parentTeamId,
      })
      await subTeam.save()
      console.log('Sub-team created:', subTeam)
    }
  } catch (error) {
    console.error('Error creating sub-team:', error)
    throw error
  }
}

const getParentsTeam = async (parentTeamId) => {
  if (parentTeamId === 'none' || parentTeamId === null || !parentTeamId) {
    console.log('This team has no parent team.')
    return ''
  } else {
    await connectDB()
    let teamBreadCrumps = ''
    let parentTeam = await Teams.findOne({ _id: parentTeamId })
    while (parentTeam) {
      teamBreadCrumps = parentTeam.title + ' > ' + teamBreadCrumps
      parentTeamId = parentTeam.parentTeamId
      if (parentTeamId === 'none') {
        break
      }
      const nextParentTeam = await Teams.findOne({ _id: parentTeam.parentTeamId })
      if (!nextParentTeam) {
        break
      }
      parentTeam = nextParentTeam
    }
    console.log('Team Bread Crumps:', teamBreadCrumps.trim())
    return teamBreadCrumps.trim()
  }
}

const getTeamNameThatUserIsAdmin = async (req, res) => {
  await connectDB()
  const { userId } = req.params
  console.log('User ID to GetTeams:', userId)

  try {
    // Find all teams where the user is an admin
    // Sort teams by title in ascending order
    const teams = await UsersOfTeam.find({ userId, role: 'Admin' })
      .populate('teamId', 'title _id parentTeamId')
      .exec()

    if (teams.length === 0) {
      console.log(`No teams found for user with ID ${userId} where they are an Admin`)
      return res.status(200).json([])
    }

    // Filter out teams where teamId is null (orphaned records)
    const validTeams = teams.filter((team) => team.teamId !== null)

    if (validTeams.length === 0) {
      console.log(`No valid teams found for user with ID ${userId}`)
      return res.status(200).json([])
    }

    // Use Promise.all to wait for all async operations to complete
    const teamsData = await Promise.all(
      validTeams.map(async (team) => ({
        teamId: team.teamId._id,
        title: await getParentsTeam(team.teamId.parentTeamId) + ' ' + team.teamId.title,
      })),
    )

    console.log('Resolved teams data:', teamsData)
    return res.status(200).json(teamsData)
  } catch (error) {
    console.error('Error fetching teams for user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getTeamThatUserIsMember = async (req, res) => {
  // Get all teams that the user is a member of, include admins
  // Return an array of team objects with teamId, title, category, and description, full breadcrumps
  const { userId } = req.params
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' })
  }
  await connectDB()
  try {
    const teams = await UsersOfTeam.find({ userId })
      .populate('teamId', 'title category description _id parentTeamId role')
      .exec()
    if (teams.length === 0) {
      console.log(`No teams found for user with ID ${userId}`)
      return res.status(200).json([])
    }
    // Filter out teams where teamId is null (orphaned records)
    const validTeams = teams.filter((team) => team.teamId !== null)
    if (validTeams.length === 0) {
      console.log(`No valid teams found for user with ID ${userId}`)
      return res.status(200).json([])
    }

    // Use Promise.all to wait for all async operations to complete
    const teamsData = await Promise.all(
      validTeams.map(async (team) => ({
        teamId: team.teamId._id,
        title: team.teamId.title,
        fullBreadCrump: await getParentsTeam(team.teamId.parentTeamId) + ' ' + team.teamId.title,
        category: team.teamId.category,
        description: team.teamId.description,
        role: team.role
      })),
    )
    console.log('Resolved teams data:', teamsData)
    return res.status(200).json(teamsData)
  } catch (error) {
    console.error('Error fetching teams for user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


const deleteAUserFromATeam = async (req, res) => {
  // Delete a user from a team
  const { userId, teamId } = req.body
  if (!userId || !teamId) {
    return res.status(400).json({ error: 'User ID and Team ID are required' })
  }
  await connectDB()
  try {
    const result = await UsersOfTeam.deleteOne({ userId, teamId })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found in the team' })
    }
    console.log('User deleted from team:', userId, teamId)
    return res.status(200).json({ success: 'User deleted from team successfully' })
  } catch (error) {
    console.error('Error deleting user from team:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const recursiveDeleteSubTeams = async (teamId) => {
  // Recursively delete sub-teams and their associated users
  await connectDB()
  try {
    const subTeams = await Teams.find({ parentTeamId: teamId })
    if (subTeams.length > 0) {
      const subTeamIds = subTeams.map((subTeam) => subTeam._id)
      await Teams.deleteMany({ parentTeamId: teamId })
      await UsersOfTeam.deleteMany({ teamId: { $in: subTeamIds }
      })
      console.log('Sub-teams and associated users deleted:', subTeamIds)
      // Recursively delete sub-teams of sub-teams
      for (const subTeamId of subTeamIds) {
        await recursiveDeleteSubTeams(subTeamId)
      }
    }
  } catch (error) {
    console.error('Error recursively deleting sub-teams:', error)
    throw error
  }
}

const deleteATeam = async (req, res) => {
  // Delete a team and all users associated with it
  // Also delete all sub-teams associated with this team
  // Also delete all sub-teams of sub-teams recursively
  const { teamId } = req.body
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' })
  }
  await connectDB()
  try {
    // First, delete all sub-teams recursively
    await recursiveDeleteSubTeams(teamId)

    // Then delete the main team and its associated users
    const result = await Teams.deleteOne({ _id: teamId })
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }

    // Also delete all users associated with this team
    await UsersOfTeam.deleteMany({ teamId })

    console.log('Team and associated users deleted:', teamId)
    return res.status(200).json({ message: 'Team and associated users deleted successfully' })
  } catch (error) {
    console.error('Error deleting team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  addUserToTeam,
  addTeamPro,
  getParentsTeam,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getCategories,
  getRoles,
  getAllUsers,
  deleteATeam
}

// nodemon "src\server\routes\teams.js"
// getTeamNameThatUserIsAdmin('684e69d04b8cfb8924086091')
// addUserToTeam('684e69d04b8cfb8924086091', 'khanhdeptrai123', '685c0070bc39268e2c142aef', 'admin')
// addUserToTeam('684e69d04b8cfb8924086091', 'khanhdeptrai123', '685c0d22b9ee795308ac5d5a', 'admin')
