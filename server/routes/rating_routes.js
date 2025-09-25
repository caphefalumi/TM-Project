import express from 'express'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import Rating from '../models/Rating.js'
const app = express.Router()

app.post('/', authenticateAccessToken, async (req, res) => {
  try {
    console.log("USer:" , req.body)
    const newRating = new Rating({
      userId: req.user.userId,
      message: req.body.message,
      issue: req.body.issue,
      featureRating: req.body.featureRating,
      perfRating: req.body.perfRating,
      uiRating: req.body.uiRating
    })
    await newRating.save()
    res.status(201).json(newRating)
  } catch (error) {
    console.error('Error creating rating:', error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/:id', authenticateAccessToken, async (req, res) => {
  try {
    const rating = await Rating.findByIdAndDelete(req.params.id)
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default app;
