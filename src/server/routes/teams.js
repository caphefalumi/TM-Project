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
            role
        })
        await userOfTeam.save()
        console.log('User added to team:', userOfTeam)
    } catch (error) {
        console.error('Error adding user to team:', error)
        throw error
    }
}

const addTeamPro = async (req, res) => {
    // Add a new team
    // This is called when user creates a new team
    // or when user creates a sub-team
  const { title, category, description, parentTeamId, userId, username } = req.body
  if( !title || !category || !description || !userId || !username) {
    return res.status(400).json({ error: 'Title, category, description, userId, and username are required' })
  } else {
    await connectDB()
    try {
        if(!parentTeamId)
        {
        await addTeam(title, category, description)
        } else
        {
            await addSubTeam(title, category, description, parentTeamId)
        }
        // Add the user who created the team as an admin
        const teamId = await Teams.findOne({ title, category, description }).select('_id')
        if (!teamId) {
            console.error('Team not found after creation:', title)
            return res.status(404).json({ error: 'Team not found' })
        } else 
        {
            await addUserToTeam(userId, username, teamId._id, 'Admin')
            console.log('User added as Admin to the team:', teamId._id)
        }
    } catch (error) {
        console.error('Error adding team:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.status(200).json({ success: 'Team added successfully' })
}

const addTeam = async (title, category, description) => {
    await connectDB()
    try {
        const team = new Teams({
            title,
            category,
            description
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
        } else if(parentTeamId === 'none') {
            console.error('Sub-team cannot have "none" as parentTeamId')
            return
        } else{
            const subTeam = new Teams({
                title,
                category,
                description,
                parentTeamId
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
    if(parentTeamId === 'none') {
        console.log('This team has no parent team.')
        return null;
    } else {
        await connectDB()
        let teamBreadCrumps = "";
        let parentTeam = await Teams.findOne({ _id: parentTeamId })
        while(parentTeam) {
            teamBreadCrumps = parentTeam.title + " > " + teamBreadCrumps;
            parentTeamId = parentTeam.parentTeamId;
            if(parentTeamId === 'none') {
                break;
            }
            const nextParentTeam = await Teams.findOne({ _id: parentTeam.parentTeamId });
            if (!nextParentTeam) {
                break;
            }
            parentTeam = nextParentTeam;
        }
        console.log('Team Bread Crumps:', teamBreadCrumps.trim());
        return teamBreadCrumps.trim();
    }
}

const getTeamNameThatUserIsAdmin = async (req, res) => {
    // returns both TeamName and TeamId where the user is an admin
  await connectDB()
  const { userId } = req.params
  console.log('User ID to GetTeams:', userId)
//   const userId  = '684e69d04b8cfb8924086091'
  try {
    // Find all teams where the user is an admin
    const teams = await UsersOfTeam.find({ userId, role: 'Admin' })
      .populate('teamId', 'title _id') // Populate the teamId with the actual team document
      .exec()
    // Populate will replace the teamId with the actual team document
    if (teams.length === 0) {
      console.log(`No teams found for user with ID ${userId} where they are an Admin`)
      return []
    }
    const teamsData = teams.map(team => ({
      teamId: team.teamId._id,
      title: team.teamId.title
    }))
    console.log(teamsData)
    return res.status(200).json(teamsData)
  } catch (error) {
    console.error('Error fetching teams for user:', error)
    throw error
  }
}

export default {
    addUserToTeam,
    addTeamPro,
    getParentsTeam,
    getTeamNameThatUserIsAdmin,
    getCategories,
    getRoles,
    getAllUsers,
}


// nodemon "src\server\routes\teams.js"
// getTeamNameThatUserIsAdmin('684e69d04b8cfb8924086091')
// addUserToTeam('684e69d04b8cfb8924086091', 'khanhdeptrai123', '685c0070bc39268e2c142aef', 'admin')
// addUserToTeam('684e69d04b8cfb8924086091', 'khanhdeptrai123', '685c0d22b9ee795308ac5d5a', 'admin')