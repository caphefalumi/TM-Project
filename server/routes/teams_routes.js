import express from 'express'
import Teams from './teams.js'
import Announcements from './announcements.js'
import Tasks from './tasks.js'
import { authenticateAccessToken } from '../verify/JWTAuth.js'
import { requirePermission } from '../verify/RoleAuth.js'

const router = express.Router()
import { addUsersToTeam, getUsersOfTeam, deleteUsersFromTeam, changeUserRole, getUserPermissions, updateUserPermissions, getRoleDefaultPermissionsAPI } from './users.js'
import { createRole, getRolesByTeam, updateRole, deleteRole, getRoleById, getAvailablePermissions, assignCustomRoleToUser } from './roles.js'
const { addTeamPro, deleteATeam, getTeamDetails, getRoles, getCategories, getTeamNameThatUserIsAdmin } = Teams
const { getAnnouncementsOfTeam, addAnnouncement, updateAnnouncement, deleteAnnouncement } = Announcements
const { getTasksOfAUserInATeam, getAllTaskGroups, getTasksByGroupId, updateTaskGroup, deleteTaskGroup } = Tasks

// Metadata
router.get('/roles', getRoles)
router.get('/categories', getCategories)

// Teams
router.post('/', addTeamPro)
router.post('/add', addUsersToTeam)
router.delete('/:teamId/users/', authenticateAccessToken, requirePermission('REMOVE_MEMBERS'), deleteUsersFromTeam)
router.get('/user/:userId/', getTeamNameThatUserIsAdmin)
router.get('/user/:userId/admin', getTeamNameThatUserIsAdmin)

router.get('/:teamId', getTeamDetails)
router.delete('/:teamId', deleteATeam)
router.get('/:teamId/users', getUsersOfTeam)
// Tasks inside team
router.get('/:teamId/:userId/tasks', getTasksOfAUserInATeam)
router.get('/:teamId/task-groups', authenticateAccessToken, requirePermission('VIEW_TASK_GROUPS'), getAllTaskGroups)
router.get('/:teamId/task-groups/:taskGroupId', authenticateAccessToken, requirePermission('VIEW_TASK_GROUPS'), getTasksByGroupId)
router.put('/:teamId/task-groups/:taskGroupId', authenticateAccessToken, requirePermission('EDIT_TASK_GROUPS'), updateTaskGroup)
router.delete('/:teamId/task-groups/:taskGroupId', authenticateAccessToken, requirePermission('EDIT_TASK_GROUPS'), deleteTaskGroup)

// Announcements inside team
router.get('/:teamId/announcements', getAnnouncementsOfTeam)
router.post('/:teamId/announcements', authenticateAccessToken, requirePermission('EDIT_ANNOUNCEMENTS'), addAnnouncement)
router.put('/:teamId/announcements/:announcementId', authenticateAccessToken, requirePermission('EDIT_ANNOUNCEMENTS'), updateAnnouncement)
router.delete('/:teamId/announcements/:announcementId', authenticateAccessToken, requirePermission('EDIT_ANNOUNCEMENTS'), deleteAnnouncement)

// Role Management
router.put('/:teamId/members/:userId/role', authenticateAccessToken, requirePermission('CHANGE_MEMBER_ROLES'), changeUserRole)
router.get('/:teamId/members/:userId/permissions', authenticateAccessToken, getUserPermissions)
router.put('/:teamId/members/:userId/permissions', authenticateAccessToken, requirePermission('CHANGE_MEMBER_ROLES'), updateUserPermissions)
router.get('/roles/:role/permissions', authenticateAccessToken, getRoleDefaultPermissionsAPI)

// Custom Roles Management for Teams
router.post('/:teamId/roles', authenticateAccessToken, requirePermission('CHANGE_MEMBER_ROLES'), createRole)
router.get('/:teamId/roles', authenticateAccessToken, getRolesByTeam)
router.get('/:teamId/roles/:roleId', authenticateAccessToken, getRoleById)
router.put('/:teamId/roles/:roleId', authenticateAccessToken, requirePermission('CHANGE_MEMBER_ROLES'), updateRole)
router.delete('/:teamId/roles/:roleId', authenticateAccessToken, requirePermission('CHANGE_MEMBER_ROLES'), deleteRole)

// Additional Role Management Endpoints
router.get('/permissions/available', authenticateAccessToken, getAvailablePermissions)
router.put('/:teamId/members/:userId/assign-role', authenticateAccessToken, requirePermission('CHANGE_MEMBER_ROLES'), assignCustomRoleToUser)

export default router
