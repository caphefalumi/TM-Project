import express from 'express'
import Tasks from './tasks.js'

const {
  addTaskToUsers,
  getTasksOfAUser,
  submitATask,
  getTaskSubmission,
} = Tasks
const router = express.Router()

router.post('/create', addTaskToUsers)
router.post('/submit', submitATask)
router.get('/submission/:taskId', getTaskSubmission)
router.get('/:userId', getTasksOfAUser)
// Metadata

export default router
