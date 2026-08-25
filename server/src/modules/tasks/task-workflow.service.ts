import Tasks from './task.model.js'
import TaskActivity from './task-activity.model.js'
import { logTaskActivity } from './task-activity.service.js'
import type { ServiceResult } from './tasks.service.js'

const result = (status: number, body: Record<string, unknown>): ServiceResult => ({ status, body })

type Actor = {
  userId: string
  username: string
}

export const updateTaskStatus = async (
  taskId: string,
  status: string,
  actor: Actor,
): Promise<ServiceResult> => {
  if (!status) {
    return result(400, { message: 'Status is required' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const oldStatus = task.status
  task.status = status as typeof task.status
  task.updatedAt = new Date()
  await task.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'status_changed',
    details: {
      field: 'status',
      oldValue: oldStatus,
      newValue: status,
      description: `Changed status from ${oldStatus} to ${status}`,
    },
  })

  return result(200, { message: 'Task status updated successfully', task })
}

export const updateTaskAssignee = async (
  taskId: string,
  assignee: string,
  actor: Actor,
): Promise<ServiceResult> => {
  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const oldAssignee = task.assignee
  task.assignee = assignee
  task.updatedAt = new Date()
  await task.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'assignee_changed',
    details: {
      field: 'assignee',
      oldValue: oldAssignee || 'None',
      newValue: assignee || 'None',
      description: `Changed assignee from ${oldAssignee || 'None'} to ${assignee || 'None'}`,
    },
  })

  return result(200, { message: 'Task assignee updated successfully', task })
}

export const logTime = async (
  taskId: string,
  hours: any,
  actor: Actor,
): Promise<ServiceResult> => {
  if (!hours || hours <= 0) {
    return result(400, { message: 'Hours must be a positive number' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  task.loggedHours = (task.loggedHours || 0) + parseFloat(hours)
  task.updatedAt = new Date()
  await task.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'time_logged',
    details: { description: `Logged ${hours} hours` },
  })

  return result(200, { message: 'Time logged successfully', task })
}

export const updateTaskEstimate = async (
  taskId: string,
  estimatedHours: any,
  actor: Actor,
): Promise<ServiceResult> => {
  if (estimatedHours === undefined || estimatedHours < 0) {
    return result(400, { message: 'Estimated hours must be a non-negative number' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const oldEstimate = task.estimatedHours
  task.estimatedHours = parseFloat(estimatedHours)
  task.updatedAt = new Date()
  await task.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'updated',
    details: {
      field: 'estimatedHours',
      oldValue: oldEstimate?.toString() || '0',
      newValue: estimatedHours.toString(),
      description: `Updated estimate from ${oldEstimate || 0}h to ${estimatedHours}h`,
    },
  })

  return result(200, { message: 'Task estimate updated successfully', task })
}

export const addTaskDependency = async (
  taskId: string,
  dependencyType: string,
  dependentTaskId: string,
  actor: Actor,
): Promise<ServiceResult> => {
  if (!dependencyType || !dependentTaskId) {
    return result(400, { message: 'Dependency type and task ID are required' })
  }
  if (dependencyType !== 'blockedBy' && dependencyType !== 'blocking') {
    return result(400, { message: 'Invalid dependency type' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const dependentTask = await Tasks.findById(dependentTaskId)
  if (!dependentTask) {
    return result(404, { message: 'Dependent task not found' })
  }
  if (taskId === dependentTaskId) {
    return result(400, { message: 'Task cannot depend on itself' })
  }

  if (!task.dependencies) {
    task.dependencies = { blockedBy: [], blocking: [] }
  }

  if (dependencyType === 'blockedBy') {
    if (!(task.dependencies.blockedBy as any[]).includes(dependentTaskId)) {
      task.dependencies.blockedBy.push(dependentTaskId as any)
      if (!dependentTask.dependencies) {
        dependentTask.dependencies = { blockedBy: [], blocking: [] }
      }
      if (!(dependentTask.dependencies.blocking as any[]).includes(taskId)) {
        dependentTask.dependencies.blocking.push(taskId as any)
      }
      await dependentTask.save()
    }
  } else if (!(task.dependencies.blocking as any[]).includes(dependentTaskId)) {
    task.dependencies.blocking.push(dependentTaskId as any)
    if (!dependentTask.dependencies) {
      dependentTask.dependencies = { blockedBy: [], blocking: [] }
    }
    if (!(dependentTask.dependencies.blockedBy as any[]).includes(taskId)) {
      dependentTask.dependencies.blockedBy.push(taskId as any)
    }
    await dependentTask.save()
  }

  task.updatedAt = new Date()
  await task.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'dependency_added',
    details: {
      description: `Added ${dependencyType} dependency with task ${dependentTask.title}`,
    },
  })

  return result(200, { message: 'Task dependency added successfully', task })
}

export const removeTaskDependency = async (
  taskId: string,
  dependencyType: string,
  dependentTaskId: string,
  actor: Actor,
): Promise<ServiceResult> => {
  if (!dependencyType || !dependentTaskId) {
    return result(400, { message: 'Dependency type and task ID are required' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const dependentTask = await Tasks.findById(dependentTaskId)
  if (!dependentTask) {
    return result(404, { message: 'Dependent task not found' })
  }

  if (task.dependencies && task.dependencies[dependencyType]) {
    task.dependencies[dependencyType] = task.dependencies[dependencyType].filter(
      (id) => id.toString() !== dependentTaskId,
    )
  }

  const reverseType = dependencyType === 'blockedBy' ? 'blocking' : 'blockedBy'
  if (dependentTask.dependencies && dependentTask.dependencies[reverseType]) {
    dependentTask.dependencies[reverseType] = dependentTask.dependencies[reverseType].filter(
      (id) => id.toString() !== taskId,
    )
  }

  task.updatedAt = new Date()
  await task.save()
  await dependentTask.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'dependency_removed',
    details: {
      description: `Removed ${dependencyType} dependency with task ${dependentTask.title}`,
    },
  })

  return result(200, { message: 'Task dependency removed successfully', task })
}

export const assignTaskToSprint = async (
  taskId: string,
  sprintId: string,
  actor: Actor,
): Promise<ServiceResult> => {
  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const oldSprint = task.sprintId
  task.sprintId = sprintId
  task.updatedAt = new Date()
  await task.save()

  await logTaskActivity({
    taskId,
    userId: actor.userId,
    username: actor.username,
    action: 'sprint_changed',
    details: {
      field: 'sprintId',
      oldValue: oldSprint || 'None',
      newValue: sprintId || 'None',
      description: `${sprintId ? 'Assigned to' : 'Removed from'} sprint`,
    },
  })

  return result(200, { message: 'Task sprint assignment updated successfully', task })
}

export const getTaskActivity = async (taskId: string): Promise<ServiceResult> => {
  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const activities = await TaskActivity.find({ taskId }).sort({ createdAt: -1 })
  return result(200, { activities, count: activities.length })
}

export default {
  updateTaskStatus,
  updateTaskAssignee,
  logTime,
  updateTaskEstimate,
  addTaskDependency,
  removeTaskDependency,
  assignTaskToSprint,
  getTaskActivity,
}
