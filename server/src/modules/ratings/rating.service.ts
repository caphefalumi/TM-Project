import Rating from './rating.model.js'

export type RatingServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): RatingServiceResult => ({
  status,
  body,
})

export const createOrUpdateRating = async (body: any): Promise<RatingServiceResult> => {
  const { userId, message, issue, featureRating, perfRating, uiRating } = body

  if (!userId || !message || !issue || !featureRating || !perfRating) {
    return result(400, {
      error: 'Missing required fields. Required: userId, message, issue, featureRating, perfRating',
    })
  }
  if (featureRating < 1 || featureRating > 5 || perfRating < 1 || perfRating > 5) {
    return result(400, { error: 'Rating values must be between 1 and 5' })
  }
  if (uiRating && (uiRating < 1 || uiRating > 5)) {
    return result(400, { error: 'UI Rating value must be between 1 and 5' })
  }

  const validIssueTypes = ['Very bad', 'Bad', 'Average', 'Good', 'Excellent']
  if (!validIssueTypes.includes(issue)) {
    return result(400, {
      error: `Invalid issue type. Must be one of: ${validIssueTypes.join(', ')}`,
    })
  }

  const existingRating = await Rating.findOne({ userId })
  if (existingRating) {
    existingRating.message = message
    existingRating.issue = issue
    existingRating.featureRating = featureRating
    existingRating.perfRating = perfRating
    if (uiRating) existingRating.uiRating = uiRating
    await existingRating.save()
    return result(200, { success: 'Feedback updated successfully' })
  }

  const newRating = new Rating({
    userId,
    message,
    issue,
    featureRating,
    perfRating,
    uiRating: uiRating || undefined,
  })
  await newRating.save()
  return result(201, { success: 'Feedback submitted successfully' })
}

export const getAllRatings = async (): Promise<RatingServiceResult> => {
  const ratings = await Rating.find().populate('userId', 'username email').sort({ createdAt: -1 })
  if (!ratings || ratings.length === 0) {
    return result(404, { error: 'No feedback found' })
  }

  const totalRatings = ratings.length
  const averageFeatureRating =
    ratings.reduce((sum, rating) => sum + rating.featureRating, 0) / totalRatings
  const averagePerfRating =
    ratings.reduce((sum, rating) => sum + rating.perfRating, 0) / totalRatings
  const averageUiRating =
    ratings.reduce((sum, rating) => sum + (rating.uiRating || 0), 0) / totalRatings
  const issueTypeDistribution = ratings.reduce<Record<string, number>>((acc, rating) => {
    acc[rating.issue] = (acc[rating.issue] || 0) + 1
    return acc
  }, {})

  return result(200, {
    ratings,
    statistics: {
      totalRatings,
      averageFeatureRating: Number(averageFeatureRating.toFixed(2)),
      averagePerfRating: Number(averagePerfRating.toFixed(2)),
      averageUiRating: Number(averageUiRating.toFixed(2)),
      issueTypeDistribution,
    },
  })
}

export const getUserRating = async (userId: string): Promise<RatingServiceResult> => {
  const rating = await Rating.findOne({ userId }).populate('userId', 'username email')
  if (!rating) {
    return result(404, { error: 'No feedback found for this user' })
  }
  return result(200, { rating })
}

export default {
  createOrUpdateRating,
  getAllRatings,
  getUserRating,
}
