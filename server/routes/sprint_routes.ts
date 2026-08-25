import express from 'express'
import {
  createSprint,
  getSprints,
  getSprint,
  updateSprint,
  deleteSprint,
  startSprint,
  completeSprint,
} from '../controllers/sprintController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { requirePermission } from '../middleware/roleMiddleware.js'

const router = express.Router()

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
