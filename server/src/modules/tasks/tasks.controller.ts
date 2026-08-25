import * as tasksService from './tasks.service.js'
import * as workflowService from './task-workflow.service.js'

const sendResult = async (res: any, operation: Promise<tasksService.ServiceResult>) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const getTasksOfAUser = async (req: any, res: any) => {
  try {
    return await sendResult(res, tasksService.getTasksOfAUser(req.user.userId))
  } catch (error) {
    console.log('Error fetching tasks:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getTasksOfAUserInATeam = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      tasksService.getTasksOfAUserInATeam(req.params.userId, req.params.teamId),
    )
  } catch (error) {
    console.log('Error fetching tasks:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const addTaskToUsers = async (req: any, res: any) => {
  try {
    return await sendResult(res, tasksService.addTaskToUsers(req.body))
  } catch (error) {
    console.log('Error adding task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const submitATask = async (req: any, res: any) => {
  try {
    return await sendResult(res, tasksService.submitATask(req.body))
  } catch (error: any) {
    console.log('Error submitting task:', error)
    return res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

export const getTasksByGroupId = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      tasksService.getTasksByGroupId(req.params.taskGroupId, req.params.teamId),
    )
  } catch (error) {
    console.log('Error fetching tasks by group ID:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateTaskGroup = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      tasksService.updateTaskGroup(req.params.taskGroupId, req.params.teamId, req.body),
    )
  } catch (error) {
    console.log('Error updating task group:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteTaskGroup = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      tasksService.deleteTaskGroup(req.params.taskGroupId, req.params.teamId),
    )
  } catch (error) {
    console.log('Error deleting task group:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getAllTaskGroups = async (req: any, res: any) => {
  try {
    return await sendResult(res, tasksService.getAllTaskGroups(req.params.teamId))
  } catch (error) {
    console.log('Error fetching task groups:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getTaskSubmission = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      tasksService.getTaskSubmission(req.params.taskId, req.user?.userId),
    )
  } catch (error) {
    console.log('Error fetching task submission:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateTaskStatus = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.updateTaskStatus(req.params.taskId, req.body.status, req.user),
    )
  } catch (error) {
    console.log('Error updating task status:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateTaskAssignee = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.updateTaskAssignee(req.params.taskId, req.body.assignee, req.user),
    )
  } catch (error) {
    console.log('Error updating task assignee:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const logTime = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.logTime(req.params.taskId, req.body.hours, req.user),
    )
  } catch (error) {
    console.log('Error logging time:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateTaskEstimate = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.updateTaskEstimate(req.params.taskId, req.body.estimatedHours, req.user),
    )
  } catch (error) {
    console.log('Error updating task estimate:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const addTaskDependency = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.addTaskDependency(
        req.params.taskId,
        req.body.dependencyType,
        req.body.dependentTaskId,
        req.user,
      ),
    )
  } catch (error) {
    console.log('Error adding task dependency:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const removeTaskDependency = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.removeTaskDependency(
        req.params.taskId,
        req.body.dependencyType,
        req.body.dependentTaskId,
        req.user,
      ),
    )
  } catch (error) {
    console.log('Error removing task dependency:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const assignTaskToSprint = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      workflowService.assignTaskToSprint(req.params.taskId, req.body.sprintId, req.user),
    )
  } catch (error) {
    console.log('Error assigning task to sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getTaskActivity = async (req: any, res: any) => {
  try {
    return await sendResult(res, workflowService.getTaskActivity(req.params.taskId))
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
