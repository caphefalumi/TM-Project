import express from 'express'
import JWTAuth from '../verify/JWTAuth.js'
import Authentication from './authentication.js'
import Tokens from './tokens.js'
import Teams from './teams.js'
import Users from './users.js'
import Tasks from './tasks.js'
import Announcements from './announcements.js'
import Notifications from './notifications.js'
import Admin from './admin.js'

const {
  getUserIDAndEmailByName,
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
} = Authentication

const { authenticateAccessToken, authenticateAccessTokenOnly, authenticateRefreshToken } = JWTAuth

const { addRefreshToken, renewAccessToken, revokeRefreshToken } = Tokens

const {
  addTeamPro,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getRoles,
  getCategories,
  getAllUsers,
  deleteATeam,
} = Teams

const { addUsersToTeam, getUsersOfTeam, deleteUsersFromTeam } = Users

const {
  addTaskToUsers,
  getTasksOfAUser,
  getTasksOfAUserInATeam,
  submitATask,
  getTasksByGroupId,
  updateTaskGroup,
  deleteTaskGroup,
  getAllTaskGroups,
  getTaskSubmission,
} = Tasks

const {
  getAnnouncementsOfTeam,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleLikeAnnouncement,
  addCommentToAnnouncement,
} = Announcements

const {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
} = Notifications

const {
  checkAdminAccess,
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAllAnnouncementsForAdmin,
  deleteTeamAsAdmin,
  deleteUserAsAdmin,
  deleteAnnouncementAsAdmin,
  sendNotificationToUser,
} = Admin

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
// Get all users in the database

router.get('/api/categories', getCategories)
// Get categories of teams

router.get('/api/roles', getRoles)
// Get roles of users in the team

router.get('/api/teams/user/:userId/admin', getTeamNameThatUserIsAdmin)
// Get user data from access token

router.get('/api/teams/user/:userId', getTeamThatUserIsMember)
// Get all teams that the user is a member of

router.get('/api/teams/:teamId/members', getUsersOfTeam)
// Get all members of a team by team ID

router.get('/api/teams/:teamId/:userId/tasks', getTasksOfAUserInATeam)
// Get all tasks of a user in a team by user ID and team ID

router.get('/api/teams/:teamId/announcements', getAnnouncementsOfTeam)
// Get all announcements of a team by team ID

router.get('/api/tasks/:userId', getTasksOfAUser)

// ************************* NOTIFICATIONS *********************************

router.get('/api/notifications/:userId', getUserNotifications)
// Get notifications for a user with pagination and filtering

router.get('/api/notifications/:userId/preferences', getNotificationPreferences)
// Get user's notification preferences

router.get('/api/notifications/:userId/stats', getNotificationStats)
// Get notification statistics for a user

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

router.post('/api/auth/revoke', revokeRefreshToken)

router.post('/api/teams', addTeamPro)
// Add a new team with Pro features: categorize subteam or team

router.post('/api/teams/add/members', addUsersToTeam)
// Add users to a team

router.post('/api/teams/delete', deleteATeam)
// Delete a team by team ID

router.post('/api/tasks/create', addTaskToUsers)
// Create a new task

router.post('/api/tasks/submit', submitATask)
// Submit a task with filled form data

router.get('/api/tasks/submission/:taskId', getTaskSubmission)
// Get submission details for a specific task

// Task Group Management Routes (for admin)
router.get('/api/teams/:teamId/task-groups', getAllTaskGroups)
// Get all task groups in a team (admin dashboard)

router.get('/api/teams/:teamId/task-groups/:taskGroupId', getTasksByGroupId)
// Get all tasks in a task group for admin view

router.put('/api/teams/:teamId/task-groups/:taskGroupId', updateTaskGroup)
// Update all tasks in a group (bulk operation)

router.delete('/api/teams/:teamId/task-groups/:taskGroupId', deleteTaskGroup)
// Delete all tasks in a group

router.post('/api/teams/:teamId/create/announcements', addAnnouncement)
// Create a new announcement for a team

router.post('/api/announcements/:announcementId/like', toggleLikeAnnouncement)

router.post('/api/announcements/:announcementId/comments', addCommentToAnnouncement)

// ------------------------ Notification Handling ------------------------

router.post('/api/notifications/:userId/mark-read', markNotificationsAsRead)
// Mark notification(s) as read for a user

// ------------------------ Token Handling ------------------------

// Create new refresh token
router.post('/api/tokens/refresh', addRefreshToken)

router.get('/api/tokens/access', authenticateRefreshToken, renewAccessToken)

router.get('/api/protected', authenticateAccessToken, (req, res) => {
  console.log('Access token is valid')
  res.status(200).json({
    success: 'Access token is valid',
    user: req.user,
  })
})

// Separate endpoint for login validation (doesn't check refresh token status)
router.get('/api/login-protected', authenticateAccessTokenOnly, (req, res) => {
  console.log('Login access token is valid')
  res.status(200).json({
    success: 'Login access token is valid',
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

router.delete('/api/teams/remove/members', deleteUsersFromTeam)
// Delete users from a team by user ID and team ID

router.delete('/api/announcements/:announcementId', deleteAnnouncement)

router.delete('/api/notifications/:userId', deleteNotifications)
// Delete notification(s) for a user

// **************************** UPDATE DATA *********************************

router.put('/api/teams/:teamId/update/announcements', updateAnnouncement)

router.put('/api/notifications/:userId/preferences', updateNotificationPreferences)
// Update user's notification preferences

// ************************* ADMIN ROUTES *********************************
router.get('/api/admin/teams', authenticateAccessToken, checkAdminAccess, getAllTeamsForAdmin)
// Get all teams for admin dashboard

router.get('/api/admin/users', authenticateAccessToken, checkAdminAccess, getAllUsersForAdmin)
// Get all users for admin dashboard

router.get(
  '/api/admin/announcements',
  authenticateAccessToken,
  checkAdminAccess,
  getAllAnnouncementsForAdmin,
)
// Get all announcements for admin dashboard

router.post('/api/admin/notify', authenticateAccessToken, checkAdminAccess, sendNotificationToUser)
// Send notification to user (admin only)

router.delete(
  '/api/admin/teams/:teamId',
  authenticateAccessToken,
  checkAdminAccess,
  deleteTeamAsAdmin,
)
// Delete team and all associated data (admin only)

router.delete(
  '/api/admin/users/:userId',
  authenticateAccessToken,
  checkAdminAccess,
  deleteUserAsAdmin,
)
// Delete user and all associated data (admin only)

router.delete(
  '/api/admin/announcements/:announcementId',
  authenticateAccessToken,
  checkAdminAccess,
  deleteAnnouncementAsAdmin,
)
// Delete announcement (admin only)

export default router
