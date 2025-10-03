import express from 'express'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { 
  createOrUpdateRating, 
  getAllRatings, 
  getUserRating, 
  getTeamRatings 
} from '../controllers/ratingController.js'

const app = express.Router()

// Create or update feedback/rating
app.post('/', authenticateAccessToken, createOrUpdateRating)

// Get all ratings (admin functionality)
app.get('/', authenticateAccessToken, getAllRatings)

// Get rating for specific user
app.get('/user/:userId', authenticateAccessToken, getUserRating)

// Get team ratings (legacy - keeping for backward compatibility)
app.get('/team/:teamId', authenticateAccessToken, getTeamRatings)

export default app
