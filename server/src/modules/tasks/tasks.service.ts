import Account from '../auth/account.model.js'
import Teams from '../teams/team.model.js'
import UsersOfTeam from '../teams/team-membership.model.js'
import Tasks, { TaskSubmissions } from './task.model.js'

export type ServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): ServiceResult => ({ status, body })

export const getTasksOfAUser = async (userId: string): Promise<ServiceResult> => {
  if (!userId) {
    return result(400, { message: 'User ID is required' })
  }

  const tasks = await Tasks.find({ userId }).sort({ dueDate: 1 })
  if (tasks.length === 0) {
    return result(200, { message: 'No tasks found for this user', tasks: [] })
  }

  return result(200, { tasks })
}

export const getTasksOfAUserInATeam = async (
  userId: string,
  teamId: string,
): Promise<ServiceResult> => {
  if (!userId || !teamId) {
    return result(400, { message: 'User ID and Team ID are required' })
  }

  const userExists = await UsersOfTeam.exists({ userId, teamId })
  if (!userExists) {
    return result(404, { message: 'User not found in the specified team' })
  }

  const teamExists = await Teams.exists({ _id: teamId })
  if (!teamExists) {
    return result(404, { message: 'Team not found' })
  }

  const tasks = await Tasks.find({ userId, teamId }).sort({ dueDate: 1 })
  if (tasks.length === 0) {
    return result(200, {
      message: 'No tasks found for this user in the specified team',
      tasks: [],
    })
  }

  return result(200, { tasks })
}

export const addTaskToUsers = async (body: any): Promise<ServiceResult> => {
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
  } = body

  const taskGroupId = `task-group-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

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
    return result(400, {
      message:
        'Missing required fields: assignedUsers[], teamId, title, category, priority, weighted, startDate, dueDate, and design are required',
    })
  }

  const start = new Date(startDate)
  const due = new Date(dueDate)
  if (isNaN(start.getTime()) || isNaN(due.getTime())) {
    return result(400, { message: 'Invalid startDate or dueDate' })
  }

  const minDate = new Date('2025-01-01')
  const maxDate = new Date('2035-12-31')
  if (start < minDate || start > maxDate) {
    return result(400, {
      message: 'Start date must be between January 1, 2025 and December 31, 2035',
    })
  }
  if (due < minDate || due > maxDate) {
    return result(400, {
      message: 'Due date must be between January 1, 2025 and December 31, 2035',
    })
  }

  if (!design.fields || !Array.isArray(design.fields)) {
    return result(400, { message: 'Invalid design format. Must contain fields array' })
  }

  const teamExists = await Teams.exists({ _id: teamId })
  if (!teamExists) {
    return result(404, { message: 'Team not found' })
  }

  const usersOfTeam = await UsersOfTeam.find({ teamId, userId: { $in: assignedUsers } })
  const foundIds = usersOfTeam.map((user) => user.userId.toString())
  const missingUsers = assignedUsers.filter((userId) => !foundIds.includes(userId.toString()))

  if (missingUsers.length > 0) {
    return result(404, {
      message: 'Some assigned users are not part of the team',
      missingUsers,
    })
  }

  const tasks = assignedUsers.map((userId) => ({
    userId,
    teamId,
    taskGroupId,
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

  const newTasks = await Tasks.insertMany(tasks)
  if (!newTasks || newTasks.length === 0) {
    return result(500, { message: 'Failed to add tasks' })
  }

  return result(201, {
    message: 'Tasks added successfully',
    taskGroupId,
    tasksCreated: newTasks.length,
    tasks: newTasks,
  })
}

export const submitATask = async (body: any): Promise<ServiceResult> => {
  const { taskId, userId, teamId, submissionData } = body

  if (
    !taskId ||
    !userId ||
    !teamId ||
    !submissionData ||
    !Array.isArray(submissionData) ||
    submissionData.length === 0
  ) {
    return result(400, {
      message: 'Missing required fields. taskId, userId, teamId, and submissionData are required',
      received: { taskId, userId, teamId, submissionDataLength: submissionData?.length },
    })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  if (task.userId !== userId) {
    return result(403, { message: 'User is not assigned to this task' })
  }

  if (task.teamId !== teamId) {
    return result(403, { message: 'Task does not belong to this team' })
  }

  if (task.submitted) {
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
      return result(200, {
        message: 'Task submission updated successfully',
        submission: existingSubmission,
      })
    }
  }

  const requiredFields = task.design.fields
    .filter((field) => field.config.required)
    .map((field) => field.label)
  const submittedFieldLabels = submissionData.map((field) => field.label)
  const missingRequiredFields = requiredFields.filter(
    (label) => !submittedFieldLabels.includes(label),
  )

  if (missingRequiredFields.length > 0) {
    return result(400, {
      message: 'Missing required fields in submission data',
      missingFields: missingRequiredFields,
    })
  }

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

  const savedSubmission = await newSubmission.save()
  task.submitted = true
  task.submissions.push(savedSubmission._id)
  await task.save()

  return result(200, {
    message: 'Task submitted successfully',
    task,
    submission: savedSubmission,
  })
}

export const getTasksByGroupId = async (
  taskGroupId: string,
  teamId: string,
): Promise<ServiceResult> => {
  if (!taskGroupId || !teamId) {
    return result(400, { message: 'Task Group ID and Team ID are required' })
  }

  const tasks = await Tasks.find({ taskGroupId, teamId }).sort({ userId: 1 })
  if (tasks.length === 0) {
    return result(404, { message: 'No tasks found for this group' })
  }

  const userIds = [...new Set(tasks.map((task) => task.userId))]
  const users = await Account.find({ _id: { $in: userIds } }, { _id: 1, username: 1 })
  const userIdToUsername: Record<string, string> = {}
  users.forEach((user) => {
    userIdToUsername[user._id.toString()] = user.username
  })

  const tasksByUser = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
    const username = userIdToUsername[task.userId] || `Unknown User (${task.userId})`
    if (!acc[username]) {
      acc[username] = []
    }
    acc[username].push(task)
    return acc
  }, {})

  return result(200, {
    taskGroupId,
    tasks,
    tasksByUser,
    totalUsers: Object.keys(tasksByUser).length,
    completedTasks: tasks.filter((task) => task.submitted).length,
    totalTasks: tasks.length,
  })
}

export const updateTaskGroup = async (
  taskGroupId: string,
  teamId: string,
  body: any,
): Promise<ServiceResult> => {
  const { assignedUsers, userId: _userId, submitted: _submitted, submissions: _submissions, ...updateData } =
    body

  if (!taskGroupId || !teamId) {
    return result(400, { message: 'Task Group ID and Team ID are required' })
  }

  if (updateData.startDate || updateData.dueDate) {
    const minDate = new Date('2025-01-01')
    const maxDate = new Date('2035-12-31')

    if (updateData.startDate) {
      const startDate = new Date(updateData.startDate)
      if (isNaN(startDate.getTime())) {
        return result(400, { message: 'Invalid start date format' })
      }
      if (startDate < minDate || startDate > maxDate) {
        return result(400, {
          message: 'Start date must be between January 1, 2025 and December 31, 2035',
        })
      }
    }

    if (updateData.dueDate) {
      const dueDate = new Date(updateData.dueDate)
      if (isNaN(dueDate.getTime())) {
        return result(400, { message: 'Invalid due date format' })
      }
      if (dueDate < minDate || dueDate > maxDate) {
        return result(400, {
          message: 'Due date must be between January 1, 2025 and December 31, 2035',
        })
      }
    }
  }

  if (assignedUsers && Array.isArray(assignedUsers)) {
    const currentTasks = await Tasks.find({ taskGroupId, teamId })
    const currentUserIds = [...new Set(currentTasks.map((task) => task.userId))]
    const usersToAdd = assignedUsers.filter((userId) => !currentUserIds.includes(userId))
    const usersToRemove = currentUserIds.filter((userId) => !assignedUsers.includes(userId))

    if (usersToAdd.length > 0) {
      const usersOfTeam = await UsersOfTeam.find({ teamId, userId: { $in: usersToAdd } })
      if (usersOfTeam.length !== usersToAdd.length) {
        return result(404, { message: 'Some assigned users are not part of the team' })
      }
    }

    if (usersToRemove.length > 0) {
      await TaskSubmissions.deleteMany({
        taskId: {
          $in: currentTasks
            .filter((task) => usersToRemove.includes(task.userId))
            .map((task) => task._id),
        },
      })
      await Tasks.deleteMany({ taskGroupId, teamId, userId: { $in: usersToRemove } })
    }

    if (usersToAdd.length > 0 && currentTasks.length > 0) {
      const templateTask = currentTasks[0]
      const newTasks = usersToAdd.map((newUserId) => ({
        userId: newUserId,
        teamId,
        taskGroupId,
        title: updateData.title || templateTask.title,
        description:
          updateData.description !== undefined ? updateData.description : templateTask.description,
        design: templateTask.design,
        category: updateData.category || templateTask.category,
        priority: updateData.priority || templateTask.priority,
        weighted:
          updateData.weighted !== undefined ? updateData.weighted : templateTask.weighted,
        startDate: updateData.startDate
          ? new Date(updateData.startDate)
          : templateTask.startDate,
        dueDate: updateData.dueDate ? new Date(updateData.dueDate) : templateTask.dueDate,
      }))
      await Tasks.insertMany(newTasks)
    }
  }

  const taskUpdates = updateData
  if (Object.keys(taskUpdates).length > 0) {
    await Tasks.updateMany(
      { taskGroupId, teamId },
      { $set: { ...taskUpdates, updatedAt: new Date() } },
    )
  }

  const finalTasks = await Tasks.find({ taskGroupId, teamId })
  return result(200, {
    message: 'Task group updated successfully',
    updatedCount: finalTasks.length,
    taskGroupId,
  })
}

export const deleteTaskGroup = async (
  taskGroupId: string,
  teamId: string,
): Promise<ServiceResult> => {
  if (!taskGroupId || !teamId) {
    return result(400, { message: 'Task Group ID and Team ID are required' })
  }

  const tasks = await Tasks.find({ taskGroupId, teamId })
  const taskIds = tasks.map((task) => task._id)
  if (taskIds.length > 0) {
    await TaskSubmissions.deleteMany({ taskId: { $in: taskIds } })
  }

  const deleteResult = await Tasks.deleteMany({ taskGroupId, teamId })
  if (deleteResult.deletedCount === 0) {
    return result(404, { message: 'No tasks found for this group' })
  }

  return result(200, {
    message: 'Task group deleted successfully',
    deletedCount: deleteResult.deletedCount,
    taskGroupId,
  })
}

export const getAllTaskGroups = async (teamId: string): Promise<ServiceResult> => {
  if (!teamId) {
    return result(400, { message: 'Team ID is required' })
  }

  const taskGroups = await Tasks.aggregate([
    { $match: { teamId } },
    { $addFields: { userObjectId: { $toObjectId: '$userId' } } },
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
        completedTasks: { $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] } },
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

  return result(200, {
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
}

export const getTaskSubmission = async (
  taskId: string,
  userId: string,
): Promise<ServiceResult> => {
  if (!taskId) {
    return result(400, { message: 'Task ID is required' })
  }
  if (!userId) {
    return result(401, { message: 'User not authenticated' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const submission = await TaskSubmissions.findOne({ taskId, userId })
  if (!submission) {
    return result(404, { message: 'No submission found for this task' })
  }

  return result(200, { task, submission })
}

export default {
  getTasksOfAUser,
  getTasksOfAUserInATeam,
  addTaskToUsers,
  submitATask,
  getTasksByGroupId,
  updateTaskGroup,
  deleteTaskGroup,
  getAllTaskGroups,
  getTaskSubmission,
}
