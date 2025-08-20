import express from 'express'
import { getAllUsers, addUsersToTeam, getUsersOfTeam, deleteUsersFromTeam } from '../controllers/users.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'

const router = express.Router()

router.get('/users', authenticateAccessToken, (req, res) => {
  res.status(200).json({
    user: req.user,
    success: 'User data retrieved successfully',
  })
})

router.get('/all', getAllUsers)
router.post('/teams/add', addUsersToTeam)
router.get('/teams/:teamId/members', getUsersOfTeam)
router.delete('/teams/remove', deleteUsersFromTeam)

export default router
