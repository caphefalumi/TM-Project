import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import { invalidateCache } from '../../shared/middleware/cache.middleware.js'
import { requirePermission } from '../roles/role.middleware.js'
import TasksController from './tasks.controller.js'

const router = Router()
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

router.post(
  '/create',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  invalidateCache('cache:team::teamId:*'),
  addTaskToUsers,
)
router.post(
  '/submit',
  authenticateAccessToken,
  requirePermission('SUBMIT_TASKS'),
  invalidateCache('cache:team::teamId:*'),
  submitATask,
)
router.get(
  '/submission/:teamId/:taskId',
  authenticateAccessToken,
  requirePermission('VIEW_TASKS'),
  getTaskSubmission,
)
router.get('/', authenticateAccessToken, getTasksOfAUser)
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
router.get(
  '/:taskId/activity',
  authenticateAccessToken,
  requirePermission('VIEW_TASKS'),
  getTaskActivity,
)

export default router
