import express from 'express'
import Tasks from './tasks.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import { requirePermission } from '../verify/RoleAuth.js'

const {
  addTaskToUsers,
  getTasksOfAUser,
  submitATask,
  getTaskSubmission,
} = Tasks
const router = express.Router()

router.post('/create', authenticateAccessToken, requirePermission('CREATE_TASK_GROUPS'), addTaskToUsers)
router.post('/submit', submitATask)
router.get('/submission/:taskId', getTaskSubmission)
router.get('/:userId', getTasksOfAUser)
// Metadata

export default router
