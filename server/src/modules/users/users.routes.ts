import express from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import {
  getAuthenticatedUser,
  getAllUsers,
  updateUserProfile,
  deleteUserAccount,
  verifyEmailChange,
} from './users.controller.js'

const router = express.Router()

router.get('/', authenticateAccessToken, getAuthenticatedUser)
router.get('/all', authenticateAccessToken, getAllUsers)
router.put('/profile', authenticateAccessToken, updateUserProfile)
router.delete('/account', authenticateAccessToken, deleteUserAccount)
router.post('/email/verify', verifyEmailChange)

export default router
