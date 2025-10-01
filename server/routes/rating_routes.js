import express from 'express'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { createOrUpdateRating, getTeamRatings } from '../controllers/ratingController.js'

const app = express.Router()

app.post('/', authenticateAccessToken, createOrUpdateRating)

app.get('/:teamId', authenticateAccessToken, getTeamRatings)

export default app
