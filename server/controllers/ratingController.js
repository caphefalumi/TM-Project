import Rating from '../models/Rating.js'

export const createOrUpdateRating = async (req, res) => {
  const { userId, message, issue, featureRating, perfRating, uiRating } = req.body

  // Validate required fields based on Rating schema
  if (!userId || !message || !issue || !featureRating || !perfRating) {
    return res.status(400).json({
      error: 'Missing required fields. Required: userId, message, issue, featureRating, perfRating',
    })
  }

  // Validate rating ranges
  if (featureRating < 1 || featureRating > 5 || perfRating < 1 || perfRating > 5) {
    return res.status(400).json({
      error: 'Rating values must be between 1 and 5',
    })
  }

  if (uiRating && (uiRating < 1 || uiRating > 5)) {
    return res.status(400).json({
      error: 'UI Rating value must be between 1 and 5',
    })
  }

  // Validate issue enum values
  const validIssueTypes = ['Very bad', 'Bad', 'Average', 'Good', 'Excellent']
  if (!validIssueTypes.includes(issue)) {
    return res.status(400).json({
      error: `Invalid issue type. Must be one of: ${validIssueTypes.join(', ')}`,
    })
  }

  try {
    // Check if user already has a rating
    const existingRating = await Rating.findOne({ userId })

    if (existingRating) {
      // Update existing rating
      existingRating.message = message
      existingRating.issue = issue
      existingRating.featureRating = featureRating
      existingRating.perfRating = perfRating
      if (uiRating) existingRating.uiRating = uiRating

      await existingRating.save()
      return res.status(200).json({ success: 'Feedback updated successfully' })
    }

    // Create new rating
    const newRating = new Rating({
      userId,
      message,
      issue,
      featureRating,
      perfRating,
      uiRating: uiRating || undefined,
    })

    await newRating.save()
    return res.status(201).json({ success: 'Feedback submitted successfully' })
  } catch (error) {
    console.log('Error saving rating:', error)
    return res.status(500).json({ error: 'Failed to save feedback' })
  }
}

export const getAllRatings = async (req, res) => {
  try {
    const ratings = await Rating.find().populate('userId', 'username email').sort({ createdAt: -1 })

    if (!ratings || ratings.length === 0) {
      return res.status(404).json({ error: 'No feedback found' })
    }

    // Calculate statistics
    const totalRatings = ratings.length
    const averageFeatureRating =
      ratings.reduce((sum, rating) => sum + rating.featureRating, 0) / totalRatings
    const averagePerfRating =
      ratings.reduce((sum, rating) => sum + rating.perfRating, 0) / totalRatings
    const averageUiRating =
      ratings.reduce((sum, rating) => sum + (rating.uiRating || 0), 0) / totalRatings

    // Group by issue type
    const issueTypeDistribution = ratings.reduce((acc, rating) => {
      acc[rating.issue] = (acc[rating.issue] || 0) + 1
      return acc
    }, {})

    return res.status(200).json({
      ratings,
      statistics: {
        totalRatings,
        averageFeatureRating: Number(averageFeatureRating.toFixed(2)),
        averagePerfRating: Number(averagePerfRating.toFixed(2)),
        averageUiRating: Number(averageUiRating.toFixed(2)),
        issueTypeDistribution,
      },
    })
  } catch (error) {
    console.log('Error fetching ratings:', error)
    return res.status(500).json({ error: 'Failed to fetch feedback' })
  }
}

export const getUserRating = async (req, res) => {
  const { userId } = req.params

  try {
    const rating = await Rating.findOne({ userId }).populate('userId', 'username email')

    if (!rating) {
      return res.status(404).json({ error: 'No feedback found for this user' })
    }

    return res.status(200).json({ rating })
  } catch (error) {
    console.log('Error fetching user rating:', error)
    return res.status(500).json({ error: 'Failed to fetch user feedback' })
  }
}
