import express from 'express'
import {
  addComment,
  getComments,
  updateComment,
  deleteComment,
} from '../controllers/commentsController.ts'
import { authenticateAccessToken } from '../middleware/authMiddleware.ts'
import { requirePermission } from '../middleware/roleMiddleware.ts'

const router = express.Router()

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
