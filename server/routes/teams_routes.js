import express from 'express'
import TeamsController from '../controllers/teamsController.js'
import AnnouncementsController from '../controllers/announcementsController.js'
import TasksController from '../controllers/tasksController.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'
import { requirePermission, requireAdmin } from '../middleware/roleMiddleware.js'
import {
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
} from '../controllers/usersController.js'
import {
  createRole,
  getRolesByTeam,
  updateRole,
  deleteRole,
  assignCustomRoleToUser,
} from '../controllers/rolesController.js'
import {
  cacheResponse,
  invalidateCache,
  userCacheKey,
  teamCacheKey,
} from '../middleware/cacheMiddleware.js'

const router = express.Router()
const {
  addTeamPro,
  deleteATeam,
  getTeamDetails,
  getCategories,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getAllSubTeams,
} = TeamsController
const { getAnnouncementsOfTeam, addAnnouncement, updateAnnouncement, deleteAnnouncement } =
  AnnouncementsController
const {
  getTasksOfAUserInATeam,
  getAllTaskGroups,
  getTasksByGroupId,
  updateTaskGroup,
  deleteTaskGroup,
} = TasksController

// Categories are static - cache for 24 hours
router.get('/categories', cacheResponse(86400), getCategories)

// Create team - invalidate user's team cache
router.post('/', invalidateCache('cache:user:*:/'), addTeamPro)

router.post(
  '/:teamId/users/',
  authenticateAccessToken,
  requirePermission('ADD_MEMBERS'),
  invalidateCache('cache:*:teamUsers:*', 'cache:user:*:/'),
  addUsersToTeam,
)
router.delete(
  '/:teamId/users/',
  authenticateAccessToken,
  requirePermission('REMOVE_MEMBERS'),
  invalidateCache('cache:*:teamUsers:*', 'cache:user:*:/'),
  deleteUsersFromTeam,
)

// User's teams - cache for 5 minutes
router.get('/', authenticateAccessToken, cacheResponse(300, userCacheKey), getTeamThatUserIsMember)

// Admin teams - cache for 5 minutes
router.get(
  '/admin',
  authenticateAccessToken,
  cacheResponse(300, userCacheKey),
  getTeamNameThatUserIsAdmin,
)

router.get(
  '/:teamId/sub-teams',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(300, teamCacheKey),
  getAllSubTeams,
)

// Team details - cache for 10 minutes
router.get(
  '/:teamId',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(600, teamCacheKey),
  getTeamDetails,
)

// Delete team - invalidate all related caches
router.delete(
  '/:teamId',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*'),
  deleteATeam,
)

// Team users - cache for 5 minutes
router.get(
  '/:teamId/users',
  authenticateAccessToken,
  requirePermission('VIEW_MEMBERS'),
  cacheResponse(300, teamCacheKey),
  getUsersOfTeam,
)

// User tasks in team - cache for 2 minutes
router.get(
  '/:teamId/:userId/tasks',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(120),
  getTasksOfAUserInATeam,
)

// Task groups - cache for 5 minutes
router.get(
  '/:teamId/task-groups',
  authenticateAccessToken,
  requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']),
  cacheResponse(300, teamCacheKey),
  getAllTaskGroups,
)
router.get(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']),
  cacheResponse(300, teamCacheKey),
  getTasksByGroupId,
)
router.put(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  invalidateCache('cache:*:task-groups*'),
  updateTaskGroup,
)
router.delete(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('DELETE_TASKS'),
  invalidateCache('cache:*:task-groups*'),
  deleteTaskGroup,
)

// Announcements - cache for 5 minutes
router.get(
  '/:teamId/announcements',
  authenticateAccessToken,
  requirePermission('VIEW_ANNOUNCEMENTS'),
  cacheResponse(300, teamCacheKey),
  getAnnouncementsOfTeam,
)
router.post(
  '/:teamId/announcements',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  invalidateCache('cache:*:announcements*'),
  addAnnouncement,
)
router.put(
  '/:teamId/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  invalidateCache('cache:*:announcements*'),
  updateAnnouncement,
)
router.delete(
  '/:teamId/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('DELETE_ANNOUNCEMENTS'),
  invalidateCache('cache:*:announcements*'),
  deleteAnnouncement,
)

router.put(
  '/:teamId/members/:userId/role',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*:users*', 'cache:*:permissions*'),
  changeUserRole,
)
router.get(
  '/:teamId/members/:userId/permissions',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(600, teamCacheKey),
  getUserPermissions,
)
router.put(
  '/:teamId/members/:userId/permissions',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*:permissions*'),
  updateUserPermissions,
)

// Roles - cache for 30 minutes
router.post(
  '/:teamId/roles',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*:roles*'),
  createRole,
)
router.get(
  '/:teamId/roles',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(1800, teamCacheKey),
  getRolesByTeam,
)
router.put(
  '/:teamId/roles/:roleId',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*:roles*'),
  updateRole,
)
router.delete(
  '/:teamId/roles/:roleId',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*:roles*'),
  deleteRole,
)

router.put(
  '/:teamId/members/:userId/assign-role',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:*:users*', 'cache:*:permissions*'),
  assignCustomRoleToUser,
)

export default router
