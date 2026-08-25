import express from 'express'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import {
  addRefreshToken,
  revokeRefreshToken,
  renewAccessToken,
} from '../controllers/tokensController.js'
import {
  getActiveTokens,
  getSecurityStatus,
  deleteTokenById,
  deleteOtherTokens,
} from '../controllers/refreshTokenController.js'

const router = express.Router()

router.get('/active', authenticateAccessToken, getActiveTokens)

router.get('/security', authenticateAccessToken, getSecurityStatus)

router.post('/me', addRefreshToken)
router.delete('/me', revokeRefreshToken)
router.post('/refresh', renewAccessToken)

router.delete('/:tokenId', authenticateAccessToken, deleteTokenById)

router.delete('/others/all', authenticateAccessToken, deleteOtherTokens)

export default router
