import express from 'express'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import {
  getAuthenticatedUser,
  getAllUsers,
  updateUserProfile,
  deleteUserAccount,
  verifyEmailChange,
} from './users.js'
const router = express.Router()

router.get('/', authenticateAccessToken, getAuthenticatedUser)
router.get('/all', authenticateAccessToken, getAllUsers)
router.patch('/profile', authenticateAccessToken, updateUserProfile)
router.delete('/account', authenticateAccessToken, deleteUserAccount)
router.post('/email/verify', verifyEmailChange)

export default router
