import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks from '../models/Tasks.js'
import { ROLES, getBaseRoleFromRoleType, getRoleLabel } from '../middleware/roleMiddleware.js'

const getCategories = async (req, res) => {
  // Returns an array of enum categories from the Teams schema

  try {
    const categories = Teams.schema.path('category').enumValues
    if (!categories || categories.length === 0) {
      return res.status(404).json({ error: 'No categories found' })
    }
    return res.status(200).json(categories)
  } catch (error) {
    console.log('Error fetching categories:', error)
    throw error
  }
}

const addUserToTeam = async (userId, teamId, roleType = ROLES.MEMBER) => {
  try {
    const userOfTeam = new UsersOfTeam({
      userId,
      teamId,
      roleType,
    })
    // Check if the user is already in the team
    const existingUser = await UsersOfTeam.findOne({ userId, teamId })
    if (existingUser) {
      return
    } else {
      await userOfTeam.save()
    }
  } catch (error) {
    console.log('Error adding user to team:', error)
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
    try {
      if (!parentTeamId) {
        await addTeam(title, category, description)
      } else {
        await addSubTeam(title, category, description, parentTeamId)
      }
      // Add the user who created the team as an admin
      teamId = await Teams.findOne({ title, category, description }).select('_id')
      if (!teamId) {
        console.log('Team not found after creation:', title)
        return res.status(404).json({ message: 'Team not found' })
      } else {
        await addUserToTeam(userId, teamId._id, ROLES.ADMIN)
      }
    } catch (error) {
      console.log('Error adding team:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
  let breadCrumpTitle = await getParentsTeam(parentTeamId)
  if (breadCrumpTitle) {
    resTitle = breadCrumpTitle + ' ' + title
  } else {
    resTitle = title
  }
  res
    .status(200)
    .json({ teamId: teamId._id, title: resTitle, message: 'Team created successfully' })
}

const addTeam = async (title, category, description) => {
  try {
    const team = new Teams({
      title,
      category,
      description,
    })
    await team.save()
  } catch (error) {
    console.log('Error creating team:', error)
    throw error
  }
}

const addSubTeam = async (title, category, description, parentTeamId) => {
  // check for parentTeamId validity
  try {
    const parentTeam = await Teams.findById(parentTeamId)
    if (!parentTeam) {
      console.log('Parent team not found:', parentTeamId)
      return
    } else if (parentTeamId === 'none') {
      console.log('Sub-team cannot have "none" as parentTeamId')
      return
    } else {
      const subTeam = new Teams({
        title,
        category,
        description,
        parentTeamId,
      })
      await subTeam.save()
    }
  } catch (error) {
    console.log('Error creating sub-team:', error)
    throw error
  }
}

const getParentsTeam = async (parentTeamId) => {
  if (parentTeamId === 'none' || parentTeamId === null || !parentTeamId) {
    return ''
  } else {
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
    return teamBreadCrumps.trim()
  }
}

const getTeamNameThatUserIsAdmin = async (req, res) => {
  const { userId } = req.user
  try {
    // Find all teams where the user is an admin
    // Sort teams by title in ascending order
    const teams = await UsersOfTeam.find({ userId, roleType: ROLES.ADMIN })
      .populate('teamId', 'title _id parentTeamId')
      .exec()

    if (teams.length === 0) {
      return res.status(200).json([])
    }

    // Filter out teams where teamId is null (orphaned records)
    const validTeams = teams.filter((team) => team.teamId !== null)

    if (validTeams.length === 0) {
      return res.status(200).json([])
    }

    // Use Promise.all to wait for all async operations to complete
    const teamsData = await Promise.all(
      validTeams.map(async (team) => ({
        teamId: team.teamId._id,
        title: (await getParentsTeam(team.teamId.parentTeamId)) + ' ' + team.teamId.title,
      })),
    )
    return res.status(200).json(teamsData)
  } catch (error) {
    console.log('Error fetching teams for user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getTeamThatUserIsMember = async (req, res) => {
  // Get all teams that the user is a member of, include admins
  // Return an array of team objects with teamId, title, category, and description, full breadcrumps
  // Also returns a progress bar for each team
  const { userId } = req.user
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    const teams = await UsersOfTeam.find({ userId })
      .populate('teamId', 'title category description _id parentTeamId')
      .populate('roleId', 'color icon name')
      .exec()
    if (teams.length === 0) {
      return res.status(200).json([])
    }
    // Filter out teams where teamId is null (orphaned records)
    const validTeams = teams.filter((team) => team.teamId !== null)
    if (validTeams.length === 0) {
      return res.status(200).json([])
    }
    // Use Promise.all to wait for all async operations to complete
    const teamsData = await Promise.all(
      validTeams.map(async (team) => {
        const progress = await getProgressBar(userId, team.teamId._id)

        // Get role color - either from custom role or default based on base role
        let roleColor = 'red' // Default color as requested
        const baseRole = getBaseRoleFromRoleType(team.roleType)
        const roleLabel = getRoleLabel(team.roleType, team.roleId)

        if (team.roleId && team.roleId.color) {
          // Use custom role color from database
          roleColor = team.roleId.color
        } else {
          // Use default colors based on base role
          switch (baseRole) {
            case 'Admin':
              roleColor = 'red'
              break
            case 'Member':
              roleColor = 'blue'
              break
            default:
              roleColor = 'grey'
          }
        }

        return {
          teamId: team.teamId._id,
          title: team.teamId.title,
          fullBreadCrump:
            (await getParentsTeam(team.teamId.parentTeamId)) + ' ' + team.teamId.title,
          category: team.teamId.category,
          description: team.teamId.description,
          roleType: team.roleType,
          baseRole,
          roleLabel,
          customRole: team.roleId
            ? {
                id: team.roleId._id,
                name: team.roleId.name,
                icon: team.roleId.icon,
                color: team.roleId.color,
              }
            : null,
          roleColor: roleColor,
          progress: progress,
        }
      }),
    )
    return res.status(200).json(teamsData)
  } catch (error) {
    console.log('Error fetching teams for user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to recursively get all sub-teams
const getSubTeamsRecursive = async (teamId) => {
  const subTeams = await Teams.find({ parentTeamId: teamId })
  let allSubTeams = [...subTeams]

  for (const subTeam of subTeams) {
    const childSubTeams = await getSubTeamsRecursive(subTeam._id)
    allSubTeams = [...allSubTeams, ...childSubTeams]
  }

  return allSubTeams
}

const getAllSubTeams = async (req, res) => {
  // Get all sub-teams of a team recursively
  try {
    const { teamId } = req.params
    const allSubTeams = await getSubTeamsRecursive(teamId)

    return res.status(200).json({ subTeams: allSubTeams })
  } catch (error) {
    console.log('Error fetching sub-teams:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const recursiveDeleteSubTeams = async (teamId) => {
  // Recursively delete sub-teams and their associated users
  try {
    const subTeams = await Teams.find({ parentTeamId: teamId })
    if (subTeams.length > 0) {
      const subTeamIds = subTeams.map((subTeam) => subTeam._id)
      await Teams.deleteMany({ parentTeamId: teamId })
      await UsersOfTeam.deleteMany({ teamId: { $in: subTeamIds } })
      // Recursively delete sub-teams of sub-teams
      for (const subTeamId of subTeamIds) {
        await recursiveDeleteSubTeams(subTeamId)
      }
    }
  } catch (error) {
    console.log('Error recursively deleting sub-teams:', error)
    throw error
  }
}

const deleteATeam = async (req, res) => {
  // Delete a team and all users associated with it
  // Also delete all sub-teams associated with this team
  // Also delete all sub-teams of sub-teams recursively
  const { teamId } = req.params
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' })
  }

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

    return res.status(200).json({ message: 'Team and associated users deleted successfully' })
  } catch (error) {
    console.log('Error deleting team:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getProgressBar = async (userId, teamId) => {
  // Requires userId and teamId to calculate the progress bar (by weight)
  // Returns an object with completed weight, total weight, and progress percentage

  try {
    // Get all tasks for this team and user
    const allTasks = await Tasks.find({ teamId, userId })

    if (allTasks.length === 0) {
      return {
        completedWeight: 0,
        totalWeight: 0,
        progressPercentage: 0,
      }
    }

    // Calculate total weight of all tasks in the team
    const totalWeight = allTasks.reduce((sum, task) => sum + task.weighted, 0)

    // Calculate completed weight of all tasks in the team
    const completedWeight = allTasks.reduce((sum, task) => {
      return task.submitted ? sum + task.weighted : sum
    }, 0)

    const progressPercentage =
      totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0

    return {
      completedWeight,
      totalWeight,
      progressPercentage,
    }
  } catch (error) {
    console.log('Error calculating progress bar:', error)
    return {
      completedWeight: 0,
      totalWeight: 0,
      progressPercentage: 0,
    }
  }
}

const getTeamDetails = async (req, res) => {
  const { teamId } = req.params
  if (!teamId) {
    return res.status(400).json({ message: 'Team ID is required' })
  }

  try {
    const team = await Teams.findById(teamId)
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }
    return res.status(200).json({ team })
  } catch (error) {
    console.log('Error fetching team details:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  addUserToTeam,
  addTeamPro,
  getTeamDetails,
  getParentsTeam,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getCategories,
  deleteATeam,
  getProgressBar,
  getAllSubTeams,
}

// nodemon "src\server\routes\teams.js"
// getTeamNameThatUserIsAdmin('684e69d04b8cfb8924086091')
// addUserToTeam('684e69d04b8cfb8924086091', 'khanhdeptrai123', '685c0070bc39268e2c142aef', 'admin')
// addUserToTeam('684e69d04b8cfb8924086091', 'khanhdeptrai123', '685c0d22b9ee795308ac5d5a', 'admin')
