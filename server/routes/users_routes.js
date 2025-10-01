import express from 'express'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import {
  getAuthenticatedUser,
  getAllUsers,
  updateUserProfile,
  deleteUserAccount,
  verifyEmailChange,
} from '../controllers/usersController.js'

const router = express.Router()

router.get('/', authenticateAccessToken, getAuthenticatedUser)
router.get('/all', authenticateAccessToken, getAllUsers)
router.put('/profile', authenticateAccessToken, updateUserProfile)
router.delete('/account', authenticateAccessToken, deleteUserAccount)
router.post('/email/verify', verifyEmailChange)

export default router
