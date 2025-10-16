import express from 'express'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/roleMiddleware.js'
import {
  createOrUpdateRating,
  getAllRatings,
  getUserRating,
} from '../controllers/ratingController.js'

const app = express.Router()

// Create or update feedback/rating
app.post('/', authenticateAccessToken, createOrUpdateRating)

// Get all ratings (admin functionality)
app.get('/', authenticateAccessToken, requireAdmin, getAllRatings)

// Get rating for specific user
app.get('/user/:userId', authenticateAccessToken, requireAdmin, getUserRating)

export default app
