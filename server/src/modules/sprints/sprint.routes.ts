import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import { requirePermission } from '../roles/role.middleware.js'
import {
  completeSprint,
  createSprint,
  deleteSprint,
  getSprint,
  getSprints,
  startSprint,
  updateSprint,
} from './sprint.controller.js'

const router = Router()

router.post('/', authenticateAccessToken, requirePermission('MANAGE_TASKS'), createSprint)
router.get('/team/:teamId', authenticateAccessToken, requirePermission('VIEW_TASKS'), getSprints)
router.get('/:sprintId', authenticateAccessToken, requirePermission('VIEW_TASKS'), getSprint)
router.patch('/:sprintId', authenticateAccessToken, requirePermission('MANAGE_TASKS'), updateSprint)
router.delete('/:sprintId', authenticateAccessToken, requirePermission('MANAGE_TASKS'), deleteSprint)
router.post(
  '/:sprintId/start',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  startSprint,
)
router.post(
  '/:sprintId/complete',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  completeSprint,
)

export default router
