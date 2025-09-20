import express from 'express'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import { getAllUsers, updateUserProfile, deleteUserAccount } from './users.js'
const router = express.Router()

router.get('/', authenticateAccessToken, (req, res) => {
  res.status(200).json({
    user: req.user,
    success: 'User data retrieved successfully',
  })
})
router.get('/all', authenticateAccessToken, getAllUsers)
router.put('/profile', authenticateAccessToken, updateUserProfile)
router.delete('/account', authenticateAccessToken, deleteUserAccount)

export default router
