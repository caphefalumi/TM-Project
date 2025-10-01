import express from 'express'
import AnnouncementsController from '../controllers/announcementsController.js'

const router = express.Router()
const { toggleLikeAnnouncement, addCommentToAnnouncement } = AnnouncementsController

router.post('/:announcementId/like', toggleLikeAnnouncement)
router.post('/:announcementId/comments', addCommentToAnnouncement)

export default router
