import express from 'express'
import Tasks from './tasks.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import { requirePermission } from '../verify/RoleAuth.js'

const { addTaskToUsers, getTasksOfAUser, submitATask, getTaskSubmission } = Tasks
const router = express.Router()

router.post('/create', authenticateAccessToken, requirePermission('MANAGE_TASKS'), addTaskToUsers)
router.post('/submit', authenticateAccessToken, requirePermission('SUBMIT_TASKS'), submitATask)
router.get('/submission/:taskId', authenticateAccessToken, requirePermission('VIEW_TASKS'), getTaskSubmission)
router.get('/', authenticateAccessToken, getTasksOfAUser)

export default router
