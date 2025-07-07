import connectDB from '../config/db.js'
import mongoose from 'mongoose'

import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks from '../models/Tasks.js'

const addTaskToAUser = async (req, res) => {
  // Add a new task
  await connectDB()
  try {
    const { userId, teamId, title, description, category, priority, dueDate } = req.body

    if (!userId || !teamId || !title || !category || !priority || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const newTask = new Tasks({
      userId,
      teamId,
      title,
      description,
      category,
      priority,
      dueDate: new Date(dueDate),
    })

    await newTask.save()
    return res.status(201).json({ message: 'Task added successfully', task: newTask })
  } catch (error) {
    console.error('Error adding task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const addTaskToAllTeamMembers = async (req, res) => {
  // Add a new task to all members of a team {member and admin}
  await connectDB()
  try {
    const { teamId, title, description, category, priority, dueDate } = req.body

    if (!teamId || !title || !category || !priority || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Find all users in the team
    const usersOfTeam = await UsersOfTe
    if (usersOfTeam.length === 0) {
      return res.status(404).json({ error: 'No users found in the team' })
    }

    const tasks = usersOfTeam.map(user => ({
      userId: user.userId,
      teamId,
      title,
      description,
      category,
      priority,
      dueDate: new Date(dueDate),
    }))

    await Tasks.insertMany(tasks)
    return res.status(201).json({ message: 'Tasks added successfully', tasks })
  } catch (error) {
    console.error('Error adding tasks to team members:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
