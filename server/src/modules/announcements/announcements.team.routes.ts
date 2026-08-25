import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import {
  cacheResponse,
  invalidateCache,
  teamCacheKey,
} from '../../shared/middleware/cache.middleware.js'
import { requirePermission } from '../roles/role.middleware.js'
import {
  addAnnouncement,
  deleteAnnouncement,
  getAnnouncementsOfTeam,
  updateAnnouncement,
} from './announcements.controller.js'

const nestedRouter = Router({ mergeParams: true })

nestedRouter.get(
  '/announcements',
  authenticateAccessToken,
  requirePermission('VIEW_ANNOUNCEMENTS'),
  cacheResponse(300, teamCacheKey),
  getAnnouncementsOfTeam,
)
nestedRouter.post(
  '/announcements',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  invalidateCache('cache:team::teamId:*'),
  addAnnouncement,
)
nestedRouter.put(
  '/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('MANAGE_ANNOUNCEMENTS'),
  invalidateCache('cache:team::teamId:*'),
  updateAnnouncement,
)
nestedRouter.delete(
  '/announcements/:announcementId',
  authenticateAccessToken,
  requirePermission('DELETE_ANNOUNCEMENTS'),
  invalidateCache('cache:team::teamId:*'),
  deleteAnnouncement,
)

export { nestedRouter }
export default nestedRouter
