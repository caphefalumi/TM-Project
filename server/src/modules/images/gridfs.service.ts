import mongoose from 'mongoose'
import { GridFSBucket, ObjectId } from 'mongodb'
import multer from 'multer'
import { GridFsStorage } from 'multer-gridfs-storage'

let gfsBucket

// Initialize GridFS Bucket
const initGridFS = () => {
  const conn = mongoose.connection
  gfsBucket = new GridFSBucket(conn.db, {
    bucketName: 'uploads',
  })
  console.log('GridFS Bucket initialized')
}

// Create multer storage for GridFS
const createMulterGridFSStorage = () => {
  return new GridFsStorage({
    url: process.env.DB_CONNECTION_STRING,
    file: (req, file) => {
      return {
        filename: `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.originalname}`,
        bucketName: 'uploads',
        metadata: {
          uploadDate: new Date(),
          type: 'task_submission_image',
          originalName: file.originalname,
        },
      }
    },
  })
}

// Upload image buffer to GridFS
const uploadImageToGridFS = (imageBuffer, filename, mimetype) => {
  return new Promise((resolve, reject) => {
    if (!gfsBucket) {
      return reject(new Error('GridFS not initialized'))
    }

    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata: {
        uploadDate: new Date(),
        type: 'task_submission_image',
      },
    })

    uploadStream.on('finish', (file) => {
      resolve({
        fileId: uploadStream.id,
        filename: uploadStream.filename,
        contentType: mimetype,
        size: imageBuffer.length,
      })
    })

    uploadStream.on('error', (err) => {
      reject(err)
    })

    uploadStream.end(imageBuffer)
  })
}

// Get image from GridFS
const getImageFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!gfsBucket) {
      return reject(new Error('GridFS not initialized'))
    }

    try {
      const objectId = new ObjectId(fileId)
      const downloadStream = gfsBucket.openDownloadStream(objectId)

      const chunks = []
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer)
      })

      downloadStream.on('error', (err) => {
        reject(err)
      })
    } catch (err) {
      reject(new Error('Invalid file ID'))
    }
  })
}

// Get image metadata from GridFS
const getImageMetadata = async (fileId) => {
  if (!gfsBucket) {
    throw new Error('GridFS not initialized')
  }

  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(fileId)) {
      throw new Error('Invalid file ID format')
    }

    const objectId = new ObjectId(fileId)
    const files = await gfsBucket.find({ _id: objectId }).toArray()

    if (files.length === 0) {
      throw new Error('File not found')
    }

    return files[0]
  } catch (err) {
    if (err.message.includes('Invalid file ID format') || err.message.includes('File not found')) {
      throw err
    }
    throw new Error('Invalid file ID or file not found')
  }
}

// Delete image from GridFS
const deleteImageFromGridFS = async (fileId) => {
  if (!gfsBucket) {
    throw new Error('GridFS not initialized')
  }

  try {
    const objectId = new ObjectId(fileId)
    await gfsBucket.delete(objectId)
    return true
  } catch (err) {
    throw new Error('Failed to delete file or file not found')
  }
}

// Convert base64 to buffer and extract info
const processBase64Image = (base64String) => {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Image data is required and must be a string')
  }

  // Extract MIME type and data from base64 string
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)

  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format. Expected format: data:image/type;base64,data')
  }

  const mimetype = matches[1]
  const data = matches[2]

  // Validate that it's an image MIME type
  if (!mimetype.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  try {
    const buffer = Buffer.from(data, 'base64')

    if (buffer.length === 0) {
      throw new Error('Image data is empty')
    }

    return {
      buffer,
      mimetype,
      size: buffer.length,
    }
  } catch (error) {
    throw new Error('Invalid base64 data: ' + error.message)
  }
}

export {
  initGridFS,
  createMulterGridFSStorage,
  uploadImageToGridFS,
  getImageFromGridFS,
  getImageMetadata,
  deleteImageFromGridFS,
  processBase64Image,
}
