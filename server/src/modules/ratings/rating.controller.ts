import * as ratingService from './rating.service.js'

const sendResult = async (res: any, operation: Promise<ratingService.RatingServiceResult>) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const createOrUpdateRating = async (req: any, res: any) => {
  try {
    return await sendResult(res, ratingService.createOrUpdateRating(req.body))
  } catch (error) {
    console.log('Error saving rating:', error)
    return res.status(500).json({ error: 'Failed to save feedback' })
  }
}

export const getAllRatings = async (_req: any, res: any) => {
  try {
    return await sendResult(res, ratingService.getAllRatings())
  } catch (error) {
    console.log('Error fetching ratings:', error)
    return res.status(500).json({ error: 'Failed to fetch feedback' })
  }
}

export const getUserRating = async (req: any, res: any) => {
  try {
    return await sendResult(res, ratingService.getUserRating(req.params.userId))
  } catch (error) {
    console.log('Error fetching user rating:', error)
    return res.status(500).json({ error: 'Failed to fetch user feedback' })
  }
}

export default {
  createOrUpdateRating,
  getAllRatings,
  getUserRating,
}
