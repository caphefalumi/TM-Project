import connectDB from '../config/db.js'
import mongoose from 'mongoose'

import Tasks from '../models/Tasks.js'

const addTask = async (req, res) => {
  // Add a new task
  await connectDB()
  const { title, description, dueDate, assignedTo, teamId } = req.body
  if (!title || !description || !dueDate || !assignedTo || !teamId) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    const newTask = new Tasks({
      title,
      description,
      dueDate,
      assignedTo,
      teamId,
      createdAt: new Date(),
    })
    await newTask.save()
    return res.status(201).json({ success: 'Task added successfully', task: newTask })
  } catch (error) {
    console.error('Error adding task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
