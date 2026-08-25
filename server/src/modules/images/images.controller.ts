import {
  getImageFromGridFS,
  getImageMetadata,
  processBase64Image,
  uploadImageToGridFS,
} from './gridfs.service.js'

export const uploadImage = async (req: any, res: any) => {
  try {
    const { imageData, filename } = req.body
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    let processedImage
    try {
      processedImage = processBase64Image(imageData)
    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }

    const { buffer, mimetype, size } = processedImage
    const maxSize = 20 * 1024 * 1024
    if (size > maxSize) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
      })
    }

    const finalFilename =
      filename || `image_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const fileInfo: any = await uploadImageToGridFS(buffer, finalFilename, mimetype)

    return res.status(200).json({
      message: 'Image uploaded successfully',
      fileId: fileInfo.fileId,
      filename: fileInfo.filename,
      size: fileInfo.size,
      contentType: fileInfo.contentType,
    })
  } catch (error: any) {
    console.log('Error uploading image:', error.message)
    if (error.message.includes('Invalid base64')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message.includes('File too large')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message.includes('GridFS not initialized')) {
      return res.status(500).json({ error: 'Database storage not available' })
    }
    return res.status(500).json({ error: 'Failed to upload image: ' + error.message })
  }
}

export const uploadImageFile = (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    return res.status(200).json({
      message: 'Image uploaded successfully',
      fileId: req.file.id,
      filename: req.file.filename,
      size: req.file.size,
      contentType: req.file.contentType,
    })
  } catch (error) {
    console.log('Error uploading file:', error)
    return res.status(500).json({ error: 'Failed to upload image' })
  }
}

export const getImage = async (req: any, res: any) => {
  try {
    const { fileId } = req.params
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' })
    }

    const metadata: any = await getImageMetadata(fileId)
    const imageBuffer = await getImageFromGridFS(fileId)
    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.length,
      'Cache-Control': 'public, max-age=86400',
    })
    return res.send(imageBuffer)
  } catch (error: any) {
    console.log('Error retrieving image:', error.message)
    if (error.message.includes('Invalid file ID') || error.message.includes('File not found')) {
      return res.status(404).json({ error: 'Image not found' })
    }
    return res.status(500).json({ error: 'Failed to retrieve image' })
  }
}

export const getImageAsBase64 = async (req: any, res: any) => {
  try {
    const { fileId } = req.params
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' })
    }

    const metadata: any = await getImageMetadata(fileId)
    const imageBuffer: any = await getImageFromGridFS(fileId)
    const base64String = `data:${metadata.contentType};base64,${imageBuffer.toString('base64')}`

    return res.status(200).json({
      base64: base64String,
      filename: metadata.filename,
      contentType: metadata.contentType,
      size: metadata.length,
    })
  } catch (error: any) {
    console.log('Error retrieving image as base64:', error.message)
    if (error.message.includes('Invalid file ID') || error.message.includes('File not found')) {
      return res.status(404).json({ error: 'Image not found' })
    }
    return res.status(500).json({ error: 'Failed to retrieve image' })
  }
}

export default {
  uploadImage,
  uploadImageFile,
  getImage,
  getImageAsBase64,
}
