import express from 'express'
import Teams from './teams.js'
import Announcements from './announcements.js'
import Tasks from './tasks.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import { requirePermission, requireAdmin } from '../verify/RoleAuth.js'

const router = express.Router()
import {
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
} from './users.js'
import {
  createRole,
  getRolesByTeam,
  updateRole,
  deleteRole,
  getRoleById,
  assignCustomRoleToUser,
} from './roles.js'
const {
  addTeamPro,
  deleteATeam,
  getTeamDetails,
  getCategories,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getAllSubTeams,
} = Teams
const { getAnnouncementsOfTeam, addAnnouncement, updateAnnouncement, deleteAnnouncement } =
  Announcements
const {
  getTasksOfAUserInATeam,
  getAllTaskGroups,
  getTasksByGroupId,
  updateTaskGroup,
  deleteTaskGroup,
} = Tasks

// Metadata
router.get('/categories', getCategories)
// Teams
// Create a new team
router.post('/', addTeamPro)

router.post(
  '/:teamId/users/',
  authenticateAccessToken,
  requirePermission('ADD_MEMBERS'),
  addUsersToTeam,
)
router.delete(
  '/:teamId/users/',
  authenticateAccessToken,
  requirePermission('REMOVE_MEMBERS'),
  deleteUsersFromTeam,
)
router.get('/', authenticateAccessToken, getTeamThatUserIsMember)
router.get('/admin', authenticateAccessToken, getTeamNameThatUserIsAdmin)
router.get('/:teamId/sub-teams', authenticateAccessToken, requirePermission('VIEW_TEAM'), getAllSubTeams)

router.get('/:teamId', authenticateAccessToken, requirePermission('VIEW_TEAM'), getTeamDetails)
router.delete('/:teamId', authenticateAccessToken, requireAdmin, deleteATeam)
router.get('/:teamId/users', authenticateAccessToken, requirePermission('VIEW_MEMBERS'), getUsersOfTeam)
// Tasks inside team
router.get('/:teamId/:userId/tasks', getTasksOfAUserInATeam)
router.get('/:teamId/task-groups', authenticateAccessToken, requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']), getAllTaskGroups)
router.get('/:teamId/task-groups/:taskGroupId', authenticateAccessToken, requirePermission('MANAGE_TASKS'), getTasksByGroupId)
router.put(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('MANAGE_TASKS'),
  updateTaskGroup,
)
router.delete(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission('DELETE_TASKS'),
  deleteTaskGroup,
)

// Announcements inside team
router.get('/:teamId/announcements', authenticateAccessToken, requirePermission('VIEW_ANNOUNCEMENTS'), getAnnouncementsOfTeam)
router.post(
  '/:teamId/announcements',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  addAnnouncement,
)
router.put(
  '/:teamId/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  updateAnnouncement,
)
router.delete(
  '/:teamId/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('DELETE_ANNOUNCEMENTS'),
  deleteAnnouncement,
)

// Role Management
router.put('/:teamId/members/:userId/role', authenticateAccessToken, requireAdmin, changeUserRole)
router.get('/:teamId/members/:userId/permissions', authenticateAccessToken, requirePermission('VIEW_TEAM'), getUserPermissions)
router.put(
  '/:teamId/members/:userId/permissions',
  authenticateAccessToken,
  requireAdmin,
  updateUserPermissions,
)

// Custom Roles Management for Teams
router.post('/:teamId/roles', authenticateAccessToken, requireAdmin, createRole)
router.get('/:teamId/roles', authenticateAccessToken, requirePermission('VIEW_TEAM'), getRolesByTeam)
router.put('/:teamId/roles/:roleId', authenticateAccessToken, requireAdmin, updateRole)
router.delete('/:teamId/roles/:roleId', authenticateAccessToken, requireAdmin, deleteRole)

// Additional Role Management Endpoints
router.put(
  '/:teamId/members/:userId/assign-role',
  authenticateAccessToken,
  requireAdmin,
  assignCustomRoleToUser,
)

export default router
