import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import { requirePermission } from '../roles/role.middleware.js'
import { addComment, deleteComment, getComments, updateComment } from './comments.controller.js'

const router = Router()

router.post(
  '/tasks/:taskId/comments',
  authenticateAccessToken,
  requirePermission('VIEW_TASKS'),
  addComment,
)
router.get(
  '/tasks/:taskId/comments',
  authenticateAccessToken,
  requirePermission('VIEW_TASKS'),
  getComments,
)
router.patch('/comments/:commentId', authenticateAccessToken, updateComment)
router.delete('/comments/:commentId', authenticateAccessToken, deleteComment)

export default router
