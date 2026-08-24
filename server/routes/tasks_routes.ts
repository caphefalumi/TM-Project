import express from 'express'
import TasksController from '../controllers/tasksController.ts'
import { authenticateAccessToken } from '../middleware/authMiddleware.ts'
import { requirePermission } from '../middleware/roleMiddleware.ts'
import { invalidateCache } from '../middleware/cacheMiddleware.ts'

const {
  addTaskToUsers,
  getTasksOfAUser,
  submitATask,
  getTaskSubmission,
  updateTaskStatus,
  updateTaskAssignee,
  logTime,
  updateTaskEstimate,
  addTaskDependency,
  removeTaskDependency,
  assignTaskToSprint,
  getTaskActivity,
} = TasksController
const router = express.Router()

router.post('/create', authenticateAccessToken, requirePermission('MANAGE_TASKS'), invalidateCache('cache:team::teamId:*'), addTaskToUsers)
router.post('/submit', authenticateAccessToken, requirePermission('SUBMIT_TASKS'), invalidateCache('cache:team::teamId:*'), submitATask)
router.get(
  '/submission/:teamId/:taskId',
  authenticateAccessToken,
  requirePermission('VIEW_TASKS'),
  getTaskSubmission,
)
router.get('/', authenticateAccessToken, getTasksOfAUser)

// New Jira-like features endpoints
router.patch(
  '/:taskId/status',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  updateTaskStatus,
)
router.patch(
  '/:taskId/assignee',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  updateTaskAssignee,
)
router.post('/:taskId/log-time', authenticateAccessToken, requirePermission('VIEW_TASKS'), logTime)
router.patch(
  '/:taskId/estimate',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  updateTaskEstimate,
)
router.post(
  '/:taskId/dependency',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  addTaskDependency,
)
router.delete(
  '/:taskId/dependency',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  removeTaskDependency,
)
router.patch(
  '/:taskId/sprint',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  assignTaskToSprint,
)
router.get('/:taskId/activity', authenticateAccessToken, requirePermission('VIEW_TASKS'), getTaskActivity)

export default router
