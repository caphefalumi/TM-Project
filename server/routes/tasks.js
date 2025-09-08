import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'

const getTasksOfAUser = async (req, res) => {
  // Get all tasks of a user across all teams
  // Returns an array of tasks sorted by DueDate in ascending order
  // Requires userId as a parameter

  try {
    const { userId } = req.params
    if (!userId) {
      console.log('Missing required parameter: userId')
      return res.status(400).json({ message: 'User ID is required' })
    }
    // Check if the user exists in any team
    const userExists = await UsersOfTeam.exists({ userId })
    if (!userExists) {
      console.log(`User with ID ${userId} does not exist in any team`)
      return res.status(200).json({ message: 'User not found in any team', tasks: [] })
    }
    // Fetch tasks for the user across all teams
    // Sort tasks by DueDate in ascending order
    const tasks = await Tasks.find({ userId }).sort({ dueDate: 1 })
    if (tasks.length === 0) {
      console.log(`No tasks found for user ${userId}`)
      return res.status(200).json({ message: 'No tasks found for this user', tasks: [] })
    }

    return res.status(200).json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getTasksOfAUserInATeam = async (req, res) => {
  // Get all tasks of a user in a team
  // Returns an array of tasks sorted by DueDate in ascending order
  // Requires userId and teamId as parameters

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
      return res
        .status(200)
        .json({ message: 'No tasks found for this user in the specified team', tasks: [] })
    }
    return res.status(200).json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addTaskToUsers = async (req, res) => {
  // Add a new task to every user being assigned in the request body
  try {
    const {
      assignedUsers,
      teamId,
      title,
      description,
      category,
      tags,
      priority,
      startDate,
      dueDate,
      weighted,
      design,
    } = req.body

    // Generate a unique group ID for this batch of tasks
    const taskGroupId = `task-group-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    // Basic validation
    if (
      !Array.isArray(assignedUsers) ||
      assignedUsers.length === 0 ||
      !teamId ||
      !title ||
      !category ||
      !priority ||
      weighted === undefined ||
      !startDate ||
      !dueDate ||
      !design
    ) {
      return res.status(400).json({
        message:
          'Missing required fields: assignedUsers[], teamId, title, category, priority, weighted, startDate, dueDate, and design are required',
      })
    }

    // Validate date fields
    const start = new Date(startDate)
    const due = new Date(dueDate)
    if (isNaN(start) || isNaN(due)) {
      return res.status(400).json({ message: 'Invalid startDate or dueDate' })
    }

    // Validate design format
    if (!design.fields || !Array.isArray(design.fields)) {
      return res.status(400).json({ message: 'Invalid design format. Must contain fields array' })
    }

    // Check if the team exists first
    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }

    // Check if all assigned users are part of the team
    const usersOfTeam = await UsersOfTeam.find({ teamId, userId: { $in: assignedUsers } })
    const foundIds = usersOfTeam.map((u) => u.userId.toString())
    const missingUsers = assignedUsers.filter((u) => !foundIds.includes(u.toString()))

    if (missingUsers.length > 0) {
      return res.status(404).json({
        message: 'Some assigned users are not part of the team',
        missingUsers,
      })
    }

    // Create tasks for each assigned user
    const tasks = assignedUsers.map((userId) => ({
      userId,
      teamId,
      taskGroupId, // Add the group ID to link related tasks
      title,
      description,
      design,
      category,
      tags,
      priority,
      weighted,
      startDate: start,
      dueDate: due,
    }))

    // Insert all tasks into the database
    const newTasks = await Tasks.insertMany(tasks)

    if (!newTasks || newTasks.length === 0) {
      return res.status(500).json({ message: 'Failed to add tasks' })
    }

    return res.status(201).json({
      message: 'Tasks added successfully',
      taskGroupId, // Return the group ID for frontend reference
      tasksCreated: newTasks.length,
      tasks: newTasks,
    })
  } catch (error) {
    console.error('Error adding task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const submitATask = async (req, res) => {
  // Submit a task by marking a task as submitted and creating a TaskSubmission record
  // Requires taskId, userId, teamId, and submissionData in request body

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

const getTasksByGroupId = async (req, res) => {
  // Get all tasks in a task group for admin view
  // Returns tasks grouped by user with submission status

  try {
    const { taskGroupId, teamId } = req.params
    if (!taskGroupId || !teamId) {
      return res.status(400).json({ message: 'Task Group ID and Team ID are required' })
    }

    const tasks = await Tasks.find({ taskGroupId, teamId }).sort({ userId: 1 })
    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found for this group' })
    }

    // Group tasks by user for easier admin view
    const tasksByUser = tasks.reduce((acc, task) => {
      if (!acc[task.userId]) {
        acc[task.userId] = []
      }
      acc[task.userId].push(task)
      return acc
    }, {})

    return res.status(200).json({
      taskGroupId,
      tasks,
      tasksByUser,
      totalUsers: Object.keys(tasksByUser).length,
      completedTasks: tasks.filter((task) => task.submitted).length,
      totalTasks: tasks.length,
    })
  } catch (error) {
    console.error('Error fetching tasks by group ID:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const updateTaskGroup = async (req, res) => {
  // Update all tasks in a group (for admin bulk operations)
  // Can update title, description, priority, startDate, dueDate, weighted, and reassign users

  try {
    const { taskGroupId, teamId } = req.params
    const { assignedUsers, userId, submitted, submissions, ...updateData } = req.body

    if (!taskGroupId || !teamId) {
      return res.status(400).json({ message: 'Task Group ID and Team ID are required' })
    }

    // If assignedUsers is provided, handle user reassignment
    if (assignedUsers && Array.isArray(assignedUsers)) {
      // Get current tasks in the group
      const currentTasks = await Tasks.find({ taskGroupId, teamId })
      const currentUserIds = [...new Set(currentTasks.map((task) => task.userId))]

      // Determine users to add and remove
      const usersToAdd = assignedUsers.filter((userId) => !currentUserIds.includes(userId))
      const usersToRemove = currentUserIds.filter((userId) => !assignedUsers.includes(userId))

      console.log('Updating task group assignments:', {
        taskGroupId,
        currentUsers: currentUserIds,
        newUsers: assignedUsers,
        usersToAdd,
        usersToRemove,
      })

      // Validate all new users are team members
      if (usersToAdd.length > 0) {
        const usersOfTeam = await UsersOfTeam.find({ teamId, userId: { $in: usersToAdd } })
        if (usersOfTeam.length !== usersToAdd.length) {
          return res.status(404).json({ message: 'Some assigned users are not part of the team' })
        }
      }

      // Remove tasks for users no longer assigned
      if (usersToRemove.length > 0) {
        // Also delete their task submissions
        await TaskSubmissions.deleteMany({
          taskId: {
            $in: currentTasks.filter((t) => usersToRemove.includes(t.userId)).map((t) => t._id),
          },
        })

        await Tasks.deleteMany({
          taskGroupId,
          teamId,
          userId: { $in: usersToRemove },
        })
        console.log('Removed tasks for users:', usersToRemove)
      }

      // Add tasks for new users
      if (usersToAdd.length > 0 && currentTasks.length > 0) {
        const templateTask = currentTasks[0] // Use first task as template
        const newTasks = usersToAdd.map((newUserId) => ({
          userId: newUserId,
          teamId,
          taskGroupId,
          title: updateData.title || templateTask.title,
          description:
            updateData.description !== undefined
              ? updateData.description
              : templateTask.description,
          design: templateTask.design,
          category: updateData.category || templateTask.category,
          priority: updateData.priority || templateTask.priority,
          weighted: updateData.weighted !== undefined ? updateData.weighted : templateTask.weighted,
          startDate: updateData.startDate ? new Date(updateData.startDate) : templateTask.startDate,
          dueDate: updateData.dueDate ? new Date(updateData.dueDate) : templateTask.dueDate,
        }))

        await Tasks.insertMany(newTasks)
        console.log('Added tasks for users:', usersToAdd)
      }
    }

    // Update remaining/existing tasks with new data (excluding user assignment fields)
    const { assignedUsers: _, ...taskUpdates } = updateData

    if (Object.keys(taskUpdates).length > 0) {
      const result = await Tasks.updateMany(
        { taskGroupId, teamId },
        {
          $set: {
            ...taskUpdates,
            updatedAt: new Date(),
          },
        },
      )

      console.log('Updated task fields:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      })
    }

    // Get updated task count
    const finalTasks = await Tasks.find({ taskGroupId, teamId })

    return res.status(200).json({
      message: 'Task group updated successfully',
      updatedCount: finalTasks.length,
      taskGroupId,
    })
  } catch (error) {
    console.error('Error updating task group:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteTaskGroup = async (req, res) => {
  // Delete all tasks in a group (for admin operations)

  try {
    const { taskGroupId, teamId } = req.params

    if (!taskGroupId || !teamId) {
      return res.status(400).json({ message: 'Task Group ID and Team ID are required' })
    }

    // First, delete all task submissions for this group
    const tasks = await Tasks.find({ taskGroupId, teamId })
    const taskIds = tasks.map((task) => task._id)

    if (taskIds.length > 0) {
      await TaskSubmissions.deleteMany({ taskId: { $in: taskIds } })
    }

    // Then delete the tasks
    const result = await Tasks.deleteMany({ taskGroupId, teamId })

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No tasks found for this group' })
    }

    return res.status(200).json({
      message: 'Task group deleted successfully',
      deletedCount: result.deletedCount,
      taskGroupId,
    })
  } catch (error) {
    console.error('Error deleting task group:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getAllTaskGroups = async (req, res) => {
  // Get all task groups in a team (for admin dashboard)

  try {
    const { teamId } = req.params
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' })
    }

    // Get unique task groups with summary info
    const taskGroups = await Tasks.aggregate([
      { $match: { teamId } },
      {
        $group: {
          _id: '$taskGroupId',
          title: { $first: '$title' },
          category: { $first: '$category' },
          priority: { $first: '$priority' },
          startDate: { $first: '$startDate' },
          dueDate: { $first: '$dueDate' },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] },
          },
          totalWeight: { $sum: '$weighted' },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { createdAt: -1 } },
    ])

    return res.status(200).json({
      taskGroups: taskGroups.map((group) => ({
        taskGroupId: group._id,
        title: group.title,
        category: group.category,
        priority: group.priority,
        startDate: group.startDate,
        dueDate: group.dueDate,
        totalTasks: group.totalTasks,
        completedTasks: group.completedTasks,
        totalWeight: group.totalWeight,
        completionRate:
          group.totalTasks > 0 ? ((group.completedTasks / group.totalTasks) * 100).toFixed(1) : 0,
        createdAt: group.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching task groups:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getTaskSubmission = async (req, res) => {
  // Get submission details for a specific task

  try {
    const { taskId } = req.params
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' })
    }

    // Find the task to verify it exists
    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Find the submission for this task
    const submission = await TaskSubmissions.findOne({ taskId })

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this task' })
    }

    return res.status(200).json({
      task,
      submission,
    })
  } catch (error) {
    console.error('Error fetching task submission:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  addTaskToUsers,
  getTasksOfAUserInATeam,
  getTasksOfAUser,
  submitATask,
  getTasksByGroupId,
  updateTaskGroup,
  deleteTaskGroup,
  getAllTaskGroups,
  getTaskSubmission,
}
