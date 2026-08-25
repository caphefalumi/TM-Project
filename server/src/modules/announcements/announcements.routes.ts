import { Router } from 'express'
import {
  addCommentToAnnouncement,
  toggleLikeAnnouncement,
} from './announcements.controller.js'

const router = Router()

router.post('/:announcementId/like', toggleLikeAnnouncement)
router.post('/:announcementId/comments', addCommentToAnnouncement)

export default router
