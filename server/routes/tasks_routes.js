import express from 'express'
import TasksController from './tasks.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import { requirePermission } from '../verify/RoleAuth.js'
import TaskModel from '../models/Tasks.js'

const { addTaskToUsers, getTasksOfAUser, submitATask, getTaskSubmission } = TasksController
const router = express.Router()

const attachTaskTeamContext = async (req, res, next) => {
  try {
    const { taskId } = req.params

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' })
    }

    const task = await TaskModel.findById(taskId)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    req.permissionContext = {
      ...(req.permissionContext || {}),
      teamId: task.teamId,
    }
    req.taskDocument = task

    return next()
  } catch (error) {
    console.error('Error determining task team context:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

router.post('/create', authenticateAccessToken, requirePermission('MANAGE_TASKS'), addTaskToUsers)
router.post('/submit', authenticateAccessToken, requirePermission('SUBMIT_TASKS'), submitATask)
router.get(
  '/submission/:taskId',
  authenticateAccessToken,
  attachTaskTeamContext,
  requirePermission('VIEW_TASKS'),
  getTaskSubmission,
)
router.get('/:userId', authenticateAccessToken, getTasksOfAUser)

export default router
