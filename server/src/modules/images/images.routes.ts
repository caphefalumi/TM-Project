import { Router } from 'express'
import multer from 'multer'
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js'
import { createMulterGridFSStorage } from './gridfs.service.js'
import {
  getImage,
  getImageAsBase64,
  uploadImage,
  uploadImageFile,
} from './images.controller.js'

const router = Router()
const upload = multer({
  storage: createMulterGridFSStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true)
    } else {
      callback(new Error('Only image files are allowed'))
    }
  },
})

router.post('/upload', authenticateAccessToken, uploadImage)
router.post('/upload-file', upload.single('image'), uploadImageFile)
router.get('/:fileId', getImage)
router.get('/:fileId/base64', getImageAsBase64)

export default router
