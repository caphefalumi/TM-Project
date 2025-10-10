import express from 'express'
import TasksController from '../controllers/tasksController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { requirePermission } from '../middleware/roleMiddleware.js'

const { addTaskToUsers, getTasksOfAUser, submitATask, getTaskSubmission } = TasksController
const router = express.Router()

router.post('/create', authenticateAccessToken, requirePermission('MANAGE_TASKS'), addTaskToUsers)
router.post('/submit', authenticateAccessToken, requirePermission('SUBMIT_TASKS'), submitATask)
router.get(
  '/submission/:teamId/:taskId',
  authenticateAccessToken,
  requirePermission('VIEW_TASKS'),
  getTaskSubmission,
)
router.get('/', authenticateAccessToken, getTasksOfAUser)

export default router
