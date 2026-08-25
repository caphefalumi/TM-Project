import express from 'express'
import {
  addComment,
  getComments,
  updateComment,
  deleteComment,
} from '../controllers/commentsController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { requirePermission } from '../middleware/roleMiddleware.js'

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
