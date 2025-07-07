import express from 'express'
import JWTAuth from '../verify/JWTAuth.js'
import Authentication from './authentication.js'
import Tokens from './tokens.js'
import Teams from './teams.js'
import Users from './users.js'

const {
  getUserIDAndEmailByName,
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
} = Authentication

const { authenticateAccessToken } = JWTAuth

const { addRefreshToken, renewAccessToken } = Tokens

const {
  addTeamPro,
  getTeamNameThatUserIsAdmin,
  getRoles,
  getCategories,
  getAllUsers,
  deleteATeam
} = Teams

const { addUsersToTeam } = Users

const router = express.Router()

// ************************** GET DATA *********************************
router.get('/api/account/user/:username', getUserIDAndEmailByName)
// Get user ID by username
// Get user email by username

router.get('/api/users', authenticateAccessToken, (req, res) => {
  res.status(200).json({
    user: req.user,
    success: 'User data retrieved successfully',
  })
})

router.get('/api/allusers', getAllUsers)

router.get('/api/categories', getCategories)

router.get('/api/roles', getRoles)

router.get('/api/teams/user/:userId/admin', getTeamNameThatUserIsAdmin)
// Get user data from access token

// *************************** POST DATA *********************************
router.post('/api/account/oauth', oAuthentication)
// Check OAuth whether account is registered or not.
// If account is not registered, reroute to '/api/account/google/register'.
// Otherwise reroute to '/home'

router.post('/api/account/google/register', oAuthenticationRegister)
// Register user using OAuth.

router.post('/api/account/local/register', localRegister)
// Locally registered an account

router.post('/api/account/local/login', localLogin)
// Login an account that is locally registered

router.post('/api/teams', addTeamPro)
// Add a new team with Pro features: categorize subteam or team

router.post('/api/teams/add/members', addUsersToTeam)

router.post('/api/teams/delete', deleteATeam)

// ------------------------ Token Handling ------------------------

// Create new refresh token
router.post('/api/tokens/refresh', addRefreshToken)

router.get('/api/tokens/access', renewAccessToken)

router.get('/api/protected', authenticateAccessToken, (req, res) => {
  console.log('Access token is valid')
  res.status(200).json({
    success: 'Access token is valid',
    user: req.user,
  })
})

// ************************* DELETE DATA *********************************
// Delete refresh token
router.delete('/api/tokens/refresh', (req, res) => {
  // Delete refresh token
  // This is called when user logout
  // or when refresh token is expired
  // or before creating a new one
  // Delete the refresh token from the database

  res.status(200).json({ success: 'Refresh token deleted' })
})

export default router
