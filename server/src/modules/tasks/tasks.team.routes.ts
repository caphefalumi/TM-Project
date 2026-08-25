import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import {
  cacheResponse,
  invalidateCache,
  teamCacheKey,
} from '../../shared/middleware/cache.middleware.js'
import { requirePermission } from '../roles/role.middleware.js'
import TasksController from './tasks.controller.js'

const nestedRouter = Router({ mergeParams: true })
const {
  getTasksOfAUserInATeam,
  getAllTaskGroups,
  getTasksByGroupId,
  updateTaskGroup,
  deleteTaskGroup,
} = TasksController

nestedRouter.get(
  '/:userId/tasks',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(120, teamCacheKey),
  getTasksOfAUserInATeam,
)
nestedRouter.get(
  '/task-groups',
  authenticateAccessToken,
  requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']),
  cacheResponse(300, teamCacheKey),
  getAllTaskGroups,
)
nestedRouter.get(
  '/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']),
  cacheResponse(300, teamCacheKey),
  getTasksByGroupId,
)
nestedRouter.put(
  '/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  invalidateCache('cache:team::teamId:*'),
  updateTaskGroup,
)
nestedRouter.delete(
  '/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('DELETE_TASKS'),
  invalidateCache('cache:team::teamId:*'),
  deleteTaskGroup,
)

export { nestedRouter }
export default nestedRouter
