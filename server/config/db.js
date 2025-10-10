import mongoose from 'mongoose'
import { initGridFS } from '../services/gridfsService.js'

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING)
    console.log('MongoDB connected successfully to ' + process.env.DB_CONNECTION_STRING)

    // Initialize GridFS after connection is established
    if (mongoose.connection.readyState === 1) {
      initGridFS()
    } else {
      mongoose.connection.once('open', () => {
        initGridFS()
      })
    }
  } catch (err) {
    console.log('Database connection error:', err)
    process.exit(1)
  }
}

export default connectDB
