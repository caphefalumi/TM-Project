import Rating from '../models/Rating.js'

export const createOrUpdateRating = async (req, res) => {
  const { userId, teamId, rating } = req.body

  if (!userId || !teamId || rating == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const existingRating = await Rating.findOne({ userId, teamId })

    if (existingRating) {
      existingRating.rating = rating
      await existingRating.save()
      return res.status(200).json({ success: 'Rating updated successfully' })
    }

    const newRating = new Rating({ userId, teamId, rating })
    await newRating.save()
    return res.status(201).json({ success: 'Rating saved successfully' })
  } catch (error) {
    console.error('Error saving rating:', error)
    return res.status(500).json({ error: 'Failed to save rating' })
  }
}

export const getTeamRatings = async (req, res) => {
  const { teamId } = req.params

  try {
    const ratings = await Rating.find({ teamId })
    if (!ratings || ratings.length === 0) {
      return res.status(404).json({ error: 'No ratings found for this team' })
    }

    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0)
    const averageRating = totalRating / ratings.length

    return res.status(200).json({ averageRating, count: ratings.length })
  } catch (error) {
    console.error('Error fetching team ratings:', error)
    return res.status(500).json({ error: 'Failed to fetch team ratings' })
  }
}
