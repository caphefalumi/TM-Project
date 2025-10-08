import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config({ quiet: true })

export const authenticateAccessToken = (req, res, next) => {
  const token = req.cookies.accessToken

  if (!token) {
    return res.sendStatus(401)
  }

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    req.user = user
    return next()
  } catch (error) {
    return res.status(403).json({ message: 'Invalid access token' })
  }
}

export default {
  authenticateAccessToken,
}
