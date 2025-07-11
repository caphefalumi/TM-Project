import connectDB from '../config/db.js'

import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'

const getTasksOfAUser = async (req, res) => {
  // Get all tasks of a user in a team
  // Returns an array of tasks sorted by DueDate in ascending order
  // Requires userId and teamId as parameters
  await connectDB()
  try {
    const { userId, teamId } = req.params
    if (!userId || !teamId) {
      console.log('Missing required parameters:', { userId, teamId })
      return res.status(400).json({ message: 'User ID and Team ID are required' })
    }
    // Check if the user exists in the team
    const userExists = await UsersOfTeam.exists({ userId, teamId })
    if (!userExists) {
      console.log(`User with ID ${userId} not found in team ${teamId}`)
      return res.status(404).json({ message: 'User not found in the specified team' })
    }

    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      console.log(`Team with ID ${teamId} does not exist`)
      return res.status(404).json({ message: 'Team not found' })
    }

    // Fetch tasks for the user in the specified team
    // Sort tasks by DueDate in ascending order
    const tasks = await Tasks.find({ userId, teamId }).sort({ dueDate: 1 })
    if (tasks.length === 0) {
      console.log(`No tasks found for user ${userId} in team ${teamId}`)
      return res.status(200).json({ message: 'No tasks found for this user in the specified team', tasks: [] })
    }
    return res.status(200).json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addTaskToUsers = async (req, res) => {
  // Add a new task to every user being assigned in the request body
  await connectDB()
  try {
    const {
      assignedUsers,
      teamId,
      title,
      description,
      category,
      priority,
      dueDate,
      weighted,
      design,
    } = req.body

    if (
      !assignedUsers ||
      !teamId ||
      !title ||
      !category ||
      !priority ||
      !dueDate ||
      weighted === undefined ||
      !design
    ) {
      console.log('Missing required fields:', {
        assignedUsers,
        teamId,
        title,
        category,
        priority,
        dueDate,
        weighted,
        design,
      })
      return res.status(400).json({ message: 'Missing required fields' })
    }
    // assignedUsers is an array of user IDs
    // design is an array of fields
    if (!Array.isArray(assignedUsers) || assignedUsers.length === 0) {
      return res.status(400).json({ message: 'Assigned users must be a non-empty array' })
    }
    // Check if the team exists
    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }
    // Check if all assigned users are part of the team
    const usersOfTeam = await UsersOfTeam.find({ teamId, userId: { $in: assignedUsers } })
    if (usersOfTeam.length !== assignedUsers.length) {
      return res.status(404).json({ message: 'Some assigned users are not part of the team' })
    }
    // Create tasks for each assigned user
    const tasks = assignedUsers.map((userId) => ({
      userId,
      teamId,
      title,
      description,
      design,
      category,
      priority,
      weighted,
      dueDate: new Date(dueDate),
    }))
    // Insert all tasks into the database
    const newTasks = await Tasks.insertMany(tasks)
    if (newTasks.length === 0) {
      return res.status(500).json({ message: 'Failed to add tasks' })
    }
    console.log('Tasks added successfully:', newTasks)
    return res.status(201).json({ message: 'Tasks added successfully' })
  } catch (error) {
    console.error('Error adding task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const submitATask = async (req, res) => {
  // Submit a task by marking a task as submitted and creating a TaskSubmission record
  // Requires taskId, userId, teamId, and submissionData in request body
  await connectDB()
  try {
    const { taskId, userId, teamId, submissionData } = req.body

    // Validate required fields
    if (
      !taskId ||
      !userId ||
      !teamId ||
      !submissionData ||
      !Array.isArray(submissionData) ||
      submissionData.length === 0
    ) {
      console.log('Missing required fields:', {
        taskId,
        userId,
        teamId,
        submissionDataLength: submissionData?.length,
      })
      return res.status(400).json({
        message: 'Missing required fields. taskId, userId, teamId, and submissionData are required',
        received: { taskId, userId, teamId, submissionDataLength: submissionData?.length },
      })
    }

    // Check if the task exists
    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check if the user is assigned to the task
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'User is not assigned to this task' })
    }

    // Check if the team matches
    if (task.teamId !== teamId) {
      return res.status(403).json({ message: 'Task does not belong to this team' })
    }

    // Check if the task is already submitted
    // If the task is already submitted, overwrite the submission
    if (task.submitted) {
      console.log('Task already submitted, overwriting submission')
      // Find the existing submission and update it
      const existingSubmission = await TaskSubmissions.findOne({ taskId, userId, teamId })
      if (existingSubmission) {
        existingSubmission.submissionData = submissionData.map((field) => ({
          fieldId: field.fieldId,
          label: field.label,
          type: field.type,
          value: field.value,
        }))
        existingSubmission.submittedAt = new Date()
        await existingSubmission.save()
        console.log('Existing submission updated successfully:', existingSubmission)
        return res.status(200).json({
          message: 'Task submission updated successfully',
          submission: existingSubmission,
        })
      }
    }

    // Validate that all required fields from the task design are included
    const requiredFields = task.design.fields
      .filter((field) => field.config.required)
      .map((field) => field.label)
    const submittedFieldLabels = submissionData.map((field) => field.label)

    const missingRequiredFields = requiredFields.filter(
      (label) => !submittedFieldLabels.includes(label),
    )
    if (missingRequiredFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields in submission data',
        missingFields: missingRequiredFields,
      })
    }

    // Create a new TaskSubmission record
    const newSubmission = new TaskSubmissions({
      userId,
      teamId,
      taskId,
      submissionData: submissionData.map((field) => ({
        fieldId: field.fieldId,
        label: field.label,
        type: field.type,
        value: field.value,
      })),
      submittedAt: new Date(),
      status: 'Pending',
    })

    // Save the submission
    const savedSubmission = await newSubmission.save()

    // Update the task
    task.submitted = true
    task.submissions.push(savedSubmission._id)
    await task.save()
    console.log('Task submitted successfully:', task)
    console.log('Task submission saved successfully:', savedSubmission)
    return res.status(200).json({
      message: 'Task submitted successfully',
      task,
      submission: savedSubmission,
    })
  } catch (error) {
    console.error('Error submitting task:', error)
    return res.status(500).json({ message: 'Internal server error', error: error.message })
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

export default {
  addTaskToUsers,
  getTasksOfAUser,
  submitATask,
}
