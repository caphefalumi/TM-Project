import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'
import Account from '../models/Account.js'
import TaskActivity from '../models/TaskActivity.js'

const getTasksOfAUser = async (req, res) => {
  // Get all tasks of a user across all teams
  // Returns an array of tasks sorted by DueDate in ascending order
  // Requires userId as a parameter

  try {
    const userId = req.user.userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }
    // Fetch tasks for the user across all teams
    // Sort tasks by DueDate in ascending order
    const tasks = await Tasks.find({ userId }).sort({ dueDate: 1 })
    if (tasks.length === 0) {
      return res.status(200).json({ message: 'No tasks found for this user', tasks: [] })
    }

    return res.status(200).json({ tasks })
  } catch (error) {
    console.log('Error fetching tasks:', error)
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
      return res.status(400).json({ message: 'User ID and Team ID are required' })
    }
    // Check if the user exists in the team
    const userExists = await UsersOfTeam.exists({ userId, teamId })
    if (!userExists) {
      return res.status(404).json({ message: 'User not found in the specified team' })
    }

    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }

    // Fetch tasks for the user in the specified team
    // Sort tasks by DueDate in ascending order
    const tasks = await Tasks.find({ userId, teamId }).sort({ dueDate: 1 })
    if (tasks.length === 0) {
      return res
        .status(200)
        .json({ message: 'No tasks found for this user in the specified team', tasks: [] })
    }
    return res.status(200).json({ tasks })
  } catch (error) {
    console.log('Error fetching tasks:', error)
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

    // Validate date range (2025-2035)
    const minDate = new Date('2025-01-01')
    const maxDate = new Date('2035-12-31')
    if (start < minDate || start > maxDate) {
      return res.status(400).json({
        message: 'Start date must be between January 1, 2025 and December 31, 2035',
      })
    }
    if (due < minDate || due > maxDate) {
      return res.status(400).json({
        message: 'Due date must be between January 1, 2025 and December 31, 2035',
      })
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
    console.log('Error adding task:', error)
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
    return res.status(200).json({
      message: 'Task submitted successfully',
      task,
      submission: savedSubmission,
    })
  } catch (error) {
    console.log('Error submitting task:', error)
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

    // Get unique user IDs from tasks
    const userIds = [...new Set(tasks.map((task) => task.userId))]

    // Fetch user accounts to get usernames
    const users = await Account.find({ _id: { $in: userIds } }, { _id: 1, username: 1 })

    // Create a mapping from userId to username
    const userIdToUsername = {}
    users.forEach((user) => {
      userIdToUsername[user._id.toString()] = user.username
    })

    // Group tasks by username for easier admin view
    const tasksByUser = tasks.reduce((acc, task) => {
      const username = userIdToUsername[task.userId] || `Unknown User (${task.userId})`
      if (!acc[username]) {
        acc[username] = []
      }
      acc[username].push(task)
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
    console.log('Error fetching tasks by group ID:', error)
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

    // Validate date range if dates are provided
    if (updateData.startDate || updateData.dueDate) {
      const minDate = new Date('2025-01-01')
      const maxDate = new Date('2035-12-31')

      if (updateData.startDate) {
        const startDate = new Date(updateData.startDate)
        if (isNaN(startDate)) {
          return res.status(400).json({ message: 'Invalid start date format' })
        }
        if (startDate < minDate || startDate > maxDate) {
          return res.status(400).json({
            message: 'Start date must be between January 1, 2025 and December 31, 2035',
          })
        }
      }

      if (updateData.dueDate) {
        const dueDate = new Date(updateData.dueDate)
        if (isNaN(dueDate)) {
          return res.status(400).json({ message: 'Invalid due date format' })
        }
        if (dueDate < minDate || dueDate > maxDate) {
          return res.status(400).json({
            message: 'Due date must be between January 1, 2025 and December 31, 2035',
          })
        }
      }
    }

    // If assignedUsers is provided, handle user reassignment
    if (assignedUsers && Array.isArray(assignedUsers)) {
      // Get current tasks in the group
      const currentTasks = await Tasks.find({ taskGroupId, teamId })
      const currentUserIds = [...new Set(currentTasks.map((task) => task.userId))]

      // Determine users to add and remove
      const usersToAdd = assignedUsers.filter((userId) => !currentUserIds.includes(userId))
      const usersToRemove = currentUserIds.filter((userId) => !assignedUsers.includes(userId))

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
    }

    // Get updated task count
    const finalTasks = await Tasks.find({ taskGroupId, teamId })

    return res.status(200).json({
      message: 'Task group updated successfully',
      updatedCount: finalTasks.length,
      taskGroupId,
    })
  } catch (error) {
    console.log('Error updating task group:', error)
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
    console.log('Error deleting task group:', error)
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
        $addFields: {
          userObjectId: { $toObjectId: '$userId' },
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'userObjectId',
          foreignField: '_id',
          as: 'account',
        },
      },
      {
        $group: {
          _id: '$taskGroupId',
          title: { $first: '$title' },
          description: { $first: '$description' },
          category: { $first: '$category' },
          priority: { $first: '$priority' },
          startDate: { $first: '$startDate' },
          dueDate: { $first: '$dueDate' },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] },
          },
          totalWeight: { $sum: '$weighted' },
          assignedMember: {
            $addToSet: {
              $cond: [
                { $gt: [{ $size: '$account' }, 0] },
                { $arrayElemAt: ['$account.username', 0] },
                null,
              ],
            },
          },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { createdAt: -1 } },
    ])
    return res.status(200).json({
      taskGroups: taskGroups.map((group) => ({
        taskGroupId: group._id,
        title: group.title,
        description: group.description || '',
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
        assignedMember: group.assignedMember || [],
      })),
    })
  } catch (error) {
    console.log('Error fetching task groups:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const getTaskSubmission = async (req, res) => {
  // Get submission details for a specific task

  try {
    const { taskId } = req.params
    const userId = req.user?.userId // Get userId from JWT token

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' })
    }

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    // Find the task to verify it exists
    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Find the submission for this task and user
    const submission = await TaskSubmissions.findOne({ taskId, userId })

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this task' })
    }

    return res.status(200).json({
      task,
      submission,
    })
  } catch (error) {
    console.log('Error fetching task submission:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Update task status
const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params
    const { status } = req.body
    const userId = req.user.userId
    const username = req.user.username

    if (!status) {
      return res.status(400).json({ message: 'Status is required' })
    }

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const oldStatus = task.status
    task.status = status
    task.updatedAt = Date.now()
    await task.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'status_changed',
      field: 'status',
      oldValue: oldStatus,
      newValue: status,
      description: `Changed status from ${oldStatus} to ${status}`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Task status updated successfully',
      task,
    })
  } catch (error) {
    console.log('Error updating task status:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Update task assignee
const updateTaskAssignee = async (req, res) => {
  try {
    const { taskId } = req.params
    const { assignee } = req.body
    const userId = req.user.userId
    const username = req.user.username

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const oldAssignee = task.assignee
    task.assignee = assignee
    task.updatedAt = Date.now()
    await task.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'assignee_changed',
      field: 'assignee',
      oldValue: oldAssignee || 'None',
      newValue: assignee || 'None',
      description: `Changed assignee from ${oldAssignee || 'None'} to ${assignee || 'None'}`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Task assignee updated successfully',
      task,
    })
  } catch (error) {
    console.log('Error updating task assignee:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Log time on a task
const logTime = async (req, res) => {
  try {
    const { taskId } = req.params
    const { hours } = req.body
    const userId = req.user.userId
    const username = req.user.username

    if (!hours || hours <= 0) {
      return res.status(400).json({ message: 'Hours must be a positive number' })
    }

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    task.loggedHours = (task.loggedHours || 0) + parseFloat(hours)
    task.updatedAt = Date.now()
    await task.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'time_logged',
      description: `Logged ${hours} hours`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Time logged successfully',
      task,
    })
  } catch (error) {
    console.log('Error logging time:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Update task estimate
const updateTaskEstimate = async (req, res) => {
  try {
    const { taskId } = req.params
    const { estimatedHours } = req.body
    const userId = req.user.userId
    const username = req.user.username

    if (estimatedHours === undefined || estimatedHours < 0) {
      return res.status(400).json({ message: 'Estimated hours must be a non-negative number' })
    }

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const oldEstimate = task.estimatedHours
    task.estimatedHours = parseFloat(estimatedHours)
    task.updatedAt = Date.now()
    await task.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'updated',
      field: 'estimatedHours',
      oldValue: oldEstimate?.toString() || '0',
      newValue: estimatedHours.toString(),
      description: `Updated estimate from ${oldEstimate || 0}h to ${estimatedHours}h`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Task estimate updated successfully',
      task,
    })
  } catch (error) {
    console.log('Error updating task estimate:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Add task dependency
const addTaskDependency = async (req, res) => {
  try {
    const { taskId } = req.params
    const { dependencyType, dependentTaskId } = req.body
    const userId = req.user.userId
    const username = req.user.username

    if (!dependencyType || !dependentTaskId) {
      return res.status(400).json({ message: 'Dependency type and task ID are required' })
    }

    if (dependencyType !== 'blockedBy' && dependencyType !== 'blocking') {
      return res.status(400).json({ message: 'Invalid dependency type' })
    }

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const dependentTask = await Tasks.findById(dependentTaskId)
    if (!dependentTask) {
      return res.status(404).json({ message: 'Dependent task not found' })
    }

    // Prevent circular dependencies
    if (taskId === dependentTaskId) {
      return res.status(400).json({ message: 'Task cannot depend on itself' })
    }

    if (!task.dependencies) {
      task.dependencies = { blockedBy: [], blocking: [] }
    }

    if (dependencyType === 'blockedBy') {
      if (!task.dependencies.blockedBy.includes(dependentTaskId)) {
        task.dependencies.blockedBy.push(dependentTaskId)
        if (!dependentTask.dependencies) {
          dependentTask.dependencies = { blockedBy: [], blocking: [] }
        }
        if (!dependentTask.dependencies.blocking.includes(taskId)) {
          dependentTask.dependencies.blocking.push(taskId)
        }
        await dependentTask.save()
      }
    } else {
      if (!task.dependencies.blocking.includes(dependentTaskId)) {
        task.dependencies.blocking.push(dependentTaskId)
        if (!dependentTask.dependencies) {
          dependentTask.dependencies = { blockedBy: [], blocking: [] }
        }
        if (!dependentTask.dependencies.blockedBy.includes(taskId)) {
          dependentTask.dependencies.blockedBy.push(taskId)
        }
        await dependentTask.save()
      }
    }

    task.updatedAt = Date.now()
    await task.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'dependency_added',
      description: `Added ${dependencyType} dependency with task ${dependentTask.title}`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Task dependency added successfully',
      task,
    })
  } catch (error) {
    console.log('Error adding task dependency:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Remove task dependency
const removeTaskDependency = async (req, res) => {
  try {
    const { taskId } = req.params
    const { dependencyType, dependentTaskId } = req.body
    const userId = req.user.userId
    const username = req.user.username

    if (!dependencyType || !dependentTaskId) {
      return res.status(400).json({ message: 'Dependency type and task ID are required' })
    }

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const dependentTask = await Tasks.findById(dependentTaskId)
    if (!dependentTask) {
      return res.status(404).json({ message: 'Dependent task not found' })
    }

    if (task.dependencies && task.dependencies[dependencyType]) {
      task.dependencies[dependencyType] = task.dependencies[dependencyType].filter(
        (id) => id.toString() !== dependentTaskId,
      )
    }

    // Update the reverse dependency
    const reverseType = dependencyType === 'blockedBy' ? 'blocking' : 'blockedBy'
    if (dependentTask.dependencies && dependentTask.dependencies[reverseType]) {
      dependentTask.dependencies[reverseType] = dependentTask.dependencies[reverseType].filter(
        (id) => id.toString() !== taskId,
      )
    }

    task.updatedAt = Date.now()
    await task.save()
    await dependentTask.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'dependency_removed',
      description: `Removed ${dependencyType} dependency with task ${dependentTask.title}`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Task dependency removed successfully',
      task,
    })
  } catch (error) {
    console.log('Error removing task dependency:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Assign task to sprint
const assignTaskToSprint = async (req, res) => {
  try {
    const { taskId } = req.params
    const { sprintId } = req.body
    const userId = req.user.userId
    const username = req.user.username

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const oldSprint = task.sprintId
    task.sprintId = sprintId
    task.updatedAt = Date.now()
    await task.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'sprint_changed',
      field: 'sprintId',
      oldValue: oldSprint || 'None',
      newValue: sprintId || 'None',
      description: `${sprintId ? 'Assigned to' : 'Removed from'} sprint`,
    })
    await activity.save()

    return res.status(200).json({
      message: 'Task sprint assignment updated successfully',
      task,
    })
  } catch (error) {
    console.log('Error assigning task to sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Get task activity history
const getTaskActivity = async (req, res) => {
  try {
    const { taskId } = req.params

    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const activities = await TaskActivity.find({ taskId }).sort({ createdAt: -1 })

    return res.status(200).json({
      activities,
      count: activities.length,
    })
  } catch (error) {
    console.log('Error fetching task activity:', error)
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
  updateTaskStatus,
  updateTaskAssignee,
  logTime,
  updateTaskEstimate,
  addTaskDependency,
  removeTaskDependency,
  assignTaskToSprint,
  getTaskActivity,
}
