import express from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import {
  addRefreshToken,
  deleteOtherTokens,
  deleteTokenById,
  getActiveTokens,
  getSecurityStatus,
  renewAccessToken,
  revokeRefreshToken,
} from './session.controller.js'

const router = express.Router()

router.get('/active', authenticateAccessToken, getActiveTokens)
router.get('/security', authenticateAccessToken, getSecurityStatus)
router.post('/me', addRefreshToken)
router.delete('/me', revokeRefreshToken)
router.post('/refresh', renewAccessToken)
router.delete('/:tokenId', authenticateAccessToken, deleteTokenById)
router.delete('/others/all', authenticateAccessToken, deleteOtherTokens)

export default router
