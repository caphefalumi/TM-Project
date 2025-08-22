import express from 'express'
import Announcements from './announcements.js'

const router = express.Router()
const { toggleLikeAnnouncement, addCommentToAnnouncement } = Announcements

// Likes & Comments
router.post('/:announcementId/like', toggleLikeAnnouncement)
router.post('/:announcementId/comments', addCommentToAnnouncement)

export default router
