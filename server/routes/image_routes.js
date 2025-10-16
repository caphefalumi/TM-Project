import express from 'express'
import multer from 'multer'
import {
  uploadImageToGridFS,
  getImageFromGridFS,
  getImageMetadata,
  processBase64Image,
  createMulterGridFSStorage,
} from '../services/gridfsService.js'
import { authenticateAccessToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Create multer upload middleware for direct file uploads
const upload = multer({
  storage: createMulterGridFSStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Upload image endpoint (base64)
router.post('/upload', authenticateAccessToken, async (req, res) => {
  try {
    const { imageData, filename } = req.body

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    // Process base64 image
    let processedImage
    try {
      processedImage = processBase64Image(imageData)
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }

    const { buffer, mimetype, size } = processedImage

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (size > maxSize) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
      })
    }

    // Generate filename if not provided
    const finalFilename =
      filename || `image_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Upload to GridFS
    const fileInfo = await uploadImageToGridFS(buffer, finalFilename, mimetype)

    res.status(200).json({
      message: 'Image uploaded successfully',
      fileId: fileInfo.fileId,
      filename: fileInfo.filename,
      size: fileInfo.size,
      contentType: fileInfo.contentType,
    })
  } catch (error) {
    console.log('Error uploading image:', error.message)

    // Return more specific error messages
    if (error.message.includes('Invalid base64')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message.includes('File too large')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message.includes('GridFS not initialized')) {
      return res.status(500).json({ error: 'Database storage not available' })
    }

    res.status(500).json({ error: 'Failed to upload image: ' + error.message })
  }
})

// Upload image endpoint (multipart form data)
router.post('/upload-file', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    res.status(200).json({
      message: 'Image uploaded successfully',
      fileId: req.file.id,
      filename: req.file.filename,
      size: req.file.size,
      contentType: req.file.contentType,
    })
  } catch (error) {
    console.log('Error uploading file:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

// Get image endpoint
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' })
    }

    // Get image metadata
    const metadata = await getImageMetadata(fileId)

    // Get image buffer
    const imageBuffer = await getImageFromGridFS(fileId)

    // Set proper headers
    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    })

    res.send(imageBuffer)
  } catch (error) {
    console.log('Error retrieving image:', error.message)

    if (error.message.includes('Invalid file ID') || error.message.includes('File not found')) {
      return res.status(404).json({ error: 'Image not found' })
    }

    res.status(500).json({ error: 'Failed to retrieve image' })
  }
})

// Get image as base64 endpoint (for compatibility with existing frontend)
router.get('/:fileId/base64', async (req, res) => {
  try {
    const { fileId } = req.params

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' })
    }

    // Get image metadata and buffer
    const metadata = await getImageMetadata(fileId)
    const imageBuffer = await getImageFromGridFS(fileId)

    // Convert to base64
    const base64String = `data:${metadata.contentType};base64,${imageBuffer.toString('base64')}`

    res.status(200).json({
      base64: base64String,
      filename: metadata.filename,
      contentType: metadata.contentType,
      size: metadata.length,
    })
  } catch (error) {
    console.log('Error retrieving image as base64:', error.message)

    if (error.message.includes('Invalid file ID') || error.message.includes('File not found')) {
      return res.status(404).json({ error: 'Image not found' })
    }

    res.status(500).json({ error: 'Failed to retrieve image' })
  }
})

export default router
