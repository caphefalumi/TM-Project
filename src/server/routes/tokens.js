import connectDB from '../config/db.js'
import mongoose from 'mongoose'
import RefreshToken from '../models/RefreshToken.js'
import JWTAuth from '../verify/JWTAuth.js'

const { generateAccessToken, generateRefreshToken, authenticateRefreshToken } = JWTAuth

const addRefreshToken = async (req, res, next) => {
  // Middleware to:
  // 1. Add refresh token to cookie
  // 2. Create / Update refresh token in database
    await connectDB()
    const { user } = req.body
    if (!user) {
        return res.status(400).json({ error: 'User data is required' })
    }
    const refreshToken = generateRefreshToken(user)
    const accessToken = generateAccessToken(user)
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'Strict',
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
        path: '/',
    })
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        sameSite: 'Strict',
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: '/',
    })

    try {
        // Check if a refresh token already exists for the user
        let existingToken = await RefreshToken.findOne({ userId: user.userId })
        if (existingToken) {
            // Update existing token
            existingToken.token = refreshToken
            existingToken.expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
            await existingToken.save()
        } else {
            // Create new token
            const newRefreshToken = new RefreshToken({
                userId: user.userId,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
            })
            await newRefreshToken.save()
        }
        console.log('Refresh token added to database successfully')
        res.status(200).json({ success: 'Refresh token added successfully' })
    } catch (error) {
        console.error('Error adding refresh token:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const renewAccessToken = async (req, res, next) => {
    // Middleware to: Authenticate refresh token and renew access token
    authenticateRefreshToken(req, res, next)
    const accessToken = generateAccessToken(req.user)
    console.log('Renewing access token for user:', req.user)
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        sameSite: 'Strict',
        maxAge: 10 * 60 * 1000, // 10 minutes
    })
    res.status(200).json({ accessToken })
}

export default {
  addRefreshToken,
  renewAccessToken,
}
