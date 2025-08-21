import express from 'express'
import Teams from './teams.js'
import Announcements from './announcements.js'
import Tasks from './tasks.js'

const router = express.Router()
const { addTeamPro, deleteATeam, getTeamDetails, getRoles, getCategories } = Teams
const { getAnnouncementsOfTeam, addAnnouncement, updateAnnouncement, deleteAnnouncement } = Announcements
const { getTasksOfAUserInATeam, getAllTaskGroups, getTasksByGroupId, updateTaskGroup, deleteTaskGroup } = Tasks

// Metadata
router.get('/roles', getRoles)
router.get('/categories', getCategories)

// Teams
router.post('/', addTeamPro)
router.get('/:teamId', getTeamDetails)
router.delete('/:teamId', deleteATeam)

// Tasks inside team
router.get('/:teamId/users/:userId/tasks', getTasksOfAUserInATeam)
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
