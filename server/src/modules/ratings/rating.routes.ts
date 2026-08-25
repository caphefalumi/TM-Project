import { Router } from 'express'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import { requireAdmin } from '../roles/role.middleware.js'
import {
  createOrUpdateRating,
  getAllRatings,
  getUserRating,
} from './rating.controller.js'

const router = Router()

router.post('/', authenticateAccessToken, createOrUpdateRating)
router.get('/', authenticateAccessToken, requireAdmin, getAllRatings)
router.get('/user/:userId', authenticateAccessToken, requireAdmin, getUserRating)

export default router
