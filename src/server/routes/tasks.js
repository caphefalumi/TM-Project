import connectDB from '../config/db.js'
import mongoose from 'mongoose'

import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks from '../models/Tasks.js'

const getTasksOfAUser = async (req, res) => {
  // Get all tasks of a user in a team
  await connectDB()
  try {
    const { userId, teamId } = req.params
    if (!userId || !teamId) {
      return res.status(400).json({ error: 'User ID and Team ID are required' })
    }
    // Check if the user exists in the team
    const userExists = await UsersOfTeam.exists({ userId, teamId })
    if (!userExists) {
      return res.status(404).json({ error: 'User not found in the specified team' })
    }

    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Fetch tasks for the user in the specified team
    // Sort tasks by DueDate in ascending order
    const tasks = await Tasks.find({ userId, teamId }).sort({ dueDate: 1 })
    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found for this user in the specified team' })
    }
    return res.status(200).json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const addTaskToAUser = async (req, res) => {
  // Add a new task
  await connectDB()
  try {
    const { userId, teamId, title, description, category, priority, dueDate, weighted } = req.body

    if (!userId || !teamId || !title || !category || !priority || !dueDate || !weighted) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const newTask = new Tasks({
      userId,
      teamId,
      title,
      description,
      category,
      priority,
      weighted,
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
  // Add a new task to all members of a team (exclude the admin)
  await connectDB()
  try {
    const { teamId, title, description, category, priority, dueDate, weighted } = req.body

    if (!teamId || !title || !category || !priority || !dueDate || !weighted) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Check if the team exists
    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }
    // Get all users of the team excluding the admin
    const usersOfTeam = await UsersOfTeam.find({ teamId, role: { $ne: 'admin' } }, 'userId')
    if (usersOfTeam.length === 0) {
      return res.status(404).json({ message: 'No team members found to assign tasks' })
    }

    const tasks = usersOfTeam.map((user) => ({
      userId: user.userId,
      teamId,
      title,
      description,
      category,
      priority,
      weighted,
      dueDate: new Date(dueDate),
    }))

    await Tasks.insertMany(tasks)
    return res.status(201).json({ message: 'Tasks added successfully', tasks })
  } catch (error) {
    console.error('Error adding tasks to team members:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const calculateFinishedWeightedTaskOfAUser = async (req, res) => {
  // Calculate the total weight of finished tasks of a user
  // Return the total weight of finished tasks
  await connectDB()
  try {
    const { userId, teamId } = req.params

    if (!userId || !teamId) {
      return res.status(400).json({ message: 'User ID and Team ID are required' })
    }
    const tasks = await Tasks.find({ userId, teamId, submitted: true })
    if (tasks.length === 0) {
      return res.status(404).json({
        message: 'No finished tasks found for this user in the specified team',
      })
    }
    // Calculate the total weight of finished tasks
    const totalFinishedWeight = tasks.reduce((sum, task) => sum + task.weighted, 0)
    return res.status(200).json({ totalFinishedWeight })
  } catch (error) {
    console.error('Error calculating finished tasks weight:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const calculateTotalTaskWeightedOfAUser = async (req, res) => {
  // Calculate the total weighted tasks of a user
  await connectDB()
  try {
    const { userId, teamId } = req.params

    if (!userId || !teamId) {
      return res.status(400).json({ message: 'User ID and Team ID are required' })
    }

    const tasks = await Tasks.find({ userId, teamId })
    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found for this user in the specified team' })
    }
    // Calculate the total weighted tasks
    const totalWeighted = tasks.reduce((sum, task) => sum + task.weighted, 0)
    return res.status(200).json({ totalWeighted })
  } catch (error) {
    console.error('Error calculating total weighted tasks:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
