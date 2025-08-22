import express from 'express'
import Teams from './teams.js'
import Announcements from './announcements.js'
import Tasks from './tasks.js'

const router = express.Router()
import { addUsersToTeam, getUsersOfTeam,deleteUsersFromTeam,} from './users.js'
const { addTeamPro, deleteATeam, getTeamDetails, getRoles, getCategories, getTeamNameThatUserIsAdmin, getTeamThatUserIsMember } = Teams
const { getAnnouncementsOfTeam, addAnnouncement, updateAnnouncement, deleteAnnouncement } = Announcements
const { getTasksOfAUserInATeam, getAllTaskGroups, getTasksByGroupId, updateTaskGroup, deleteTaskGroup } = Tasks

// Metadata
router.get('/roles', getRoles)
router.get('/categories', getCategories)

// Teams
router.post('/', addTeamPro)
router.post('/add', addUsersToTeam)
router.delete('/teams/remove', deleteUsersFromTeam)
router.get('/user/:userId/', getTeamNameThatUserIsAdmin)
router.get('/user/:userId/admin', getTeamNameThatUserIsAdmin)

router.get('/:teamId', getTeamDetails)
router.delete('/:teamId', deleteATeam)
router.get('/:teamId/users', getUsersOfTeam)
// Tasks inside team
router.get('/:teamId/:userId/tasks', getTasksOfAUserInATeam)
router.get('/:teamId/task-groups', getAllTaskGroups)
router.get('/:teamId/task-groups/:taskGroupId', getTasksByGroupId)
router.put('/:teamId/task-groups/:taskGroupId', updateTaskGroup)
router.delete('/:teamId/task-groups/:taskGroupId', deleteTaskGroup)

// Announcements inside team
router.get('/:teamId/announcements', getAnnouncementsOfTeam)
router.post('/:teamId/announcements', addAnnouncement)
router.put('/:teamId/announcements/:announcementId', updateAnnouncement)
router.delete('/:teamId/announcements/:announcementId', deleteAnnouncement)

export default router
