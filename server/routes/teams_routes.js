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

router.get('/categories', getCategories)
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
router.get(
  '/:teamId/sub-teams',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  getAllSubTeams,
)

router.get('/:teamId', authenticateAccessToken, requirePermission('VIEW_TEAM'), getTeamDetails)
router.delete('/:teamId', authenticateAccessToken, requireAdmin, deleteATeam)
router.get(
  '/:teamId/users',
  authenticateAccessToken,
  requirePermission('VIEW_MEMBERS'),
  getUsersOfTeam,
)

router.get(
  '/:teamId/:userId/tasks',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  getTasksOfAUserInATeam,
)
router.get(
  '/:teamId/task-groups',
  authenticateAccessToken,
  requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']),
  getAllTaskGroups,
)
router.get(
  '/:teamId/task-groups/:taskGroupId',
  authenticateAccessToken,
  requirePermission(['MANAGE_TASKS', 'DELETE_TASKS']),
  getTasksByGroupId,
)
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

router.get(
  '/:teamId/announcements',
  authenticateAccessToken,
  requirePermission('VIEW_ANNOUNCEMENTS'),
  getAnnouncementsOfTeam,
)
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

router.put('/:teamId/members/:userId/role', authenticateAccessToken, requireAdmin, changeUserRole)
router.get(
  '/:teamId/members/:userId/permissions',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  getUserPermissions,
)
router.put(
  '/:teamId/members/:userId/permissions',
  authenticateAccessToken,
  requireAdmin,
  updateUserPermissions,
)

router.post('/:teamId/roles', authenticateAccessToken, requireAdmin, createRole)
router.get(
  '/:teamId/roles',
  authenticateAccessToken,
  requirePermission('VIEW_TEAM'),
  getRolesByTeam,
)
router.put('/:teamId/roles/:roleId', authenticateAccessToken, requireAdmin, updateRole)
router.delete('/:teamId/roles/:roleId', authenticateAccessToken, requireAdmin, deleteRole)

router.put(
  '/:teamId/members/:userId/assign-role',
  authenticateAccessToken,
  requireAdmin,
  assignCustomRoleToUser,
)

export default router
