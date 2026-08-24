import express from 'express'
import TeamsController from '../controllers/teamsController.ts'
import AnnouncementsController from '../controllers/announcementsController.ts'
import TasksController from '../controllers/tasksController.ts'
import { authenticateAccessToken } from '../middleware/authMiddleware.ts'
import { requirePermission, requireAdmin } from '../middleware/roleMiddleware.ts'
import {
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
} from '../controllers/usersController.ts'
import {
  createRole,
  getRolesByTeam,
  updateRole,
  deleteRole,
  assignCustomRoleToUser,
} from '../controllers/rolesController.ts'
import {
  cacheResponse,
  invalidateCache,
  userCacheKey,
  teamCacheKey,
} from '../middleware/cacheMiddleware.ts'

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

// Create team - invalidate user's team list caches
router.post('/', invalidateCache('cache:user:*'), addTeamPro)

router.post(
  '/:teamId/users/',
  authenticateAccessToken,
  requirePermission('ADD_MEMBERS'),
  invalidateCache('cache:team::teamId:*', 'cache:user:*'),
  addUsersToTeam,
)
router.delete(
  '/:teamId/users/',
  authenticateAccessToken,
  requirePermission('REMOVE_MEMBERS'),
  invalidateCache('cache:team::teamId:*', 'cache:user:*'),
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

// Delete team - invalidate team and user list caches
router.delete(
  '/:teamId',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:team::teamId:*', 'cache:user:*'),
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
  cacheResponse(120, teamCacheKey),
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
  invalidateCache('cache:team::teamId:*'),
  updateTaskGroup,
)
router.delete(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('DELETE_TASKS'),
  invalidateCache('cache:team::teamId:*'),
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
  invalidateCache('cache:team::teamId:*'),
  addAnnouncement,
)
router.put(
  '/:teamId/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  invalidateCache('cache:team::teamId:*'),
  updateAnnouncement,
)
router.delete(
  '/:teamId/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('DELETE_ANNOUNCEMENTS'),
  invalidateCache('cache:team::teamId:*'),
  deleteAnnouncement,
)

router.put(
  '/:teamId/members/:userId/role',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:team::teamId:*'),
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
  invalidateCache('cache:team::teamId:*'),
  updateUserPermissions,
)

// Roles - cache for 30 minutes
router.post(
  '/:teamId/roles',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:team::teamId:*'),
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
  invalidateCache('cache:team::teamId:*'),
  updateRole,
)
router.delete(
  '/:teamId/roles/:roleId',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:team::teamId:*'),
  deleteRole,
)

router.put(
  '/:teamId/members/:userId/assign-role',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:team::teamId:*'),
  assignCustomRoleToUser,
)

export default router
