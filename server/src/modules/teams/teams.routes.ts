import express from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import {
  cacheResponse,
  invalidateCache,
  userCacheKey,
  teamCacheKey,
} from '../../shared/middleware/cache.middleware.js'
import { requirePermission, requireAdmin } from '../roles/role.middleware.js'
import {
  createRole,
  getRolesByTeam,
  updateRole,
  deleteRole,
  assignCustomRoleToUser,
} from '../roles/roles.controller.js'
import {
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
} from './team-membership.controller.js'
import {
  addTeamPro,
  deleteATeam,
  getTeamDetails,
  getCategories,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getAllSubTeams,
} from './teams.controller.js'

const router = express.Router()

router.get('/categories', cacheResponse(86400), getCategories)
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

router.get('/', authenticateAccessToken, cacheResponse(300, userCacheKey), getTeamThatUserIsMember)
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
router.get(
  '/:teamId',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  cacheResponse(600, teamCacheKey),
  getTeamDetails,
)
router.delete(
  '/:teamId',
  authenticateAccessToken,
  requireAdmin,
  invalidateCache('cache:team::teamId:*', 'cache:user:*'),
  deleteATeam,
)
router.get(
  '/:teamId/users',
  authenticateAccessToken,
  requirePermission('VIEW_MEMBERS'),
  cacheResponse(300, teamCacheKey),
  getUsersOfTeam,
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
