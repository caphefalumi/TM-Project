import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING)
    console.log('MongoDB connected successfully to ' + process.env.DB_CONNECTION_STRING)
  } catch (err) {
    console.log('Database connection error:', err)
    process.exit(1)
  }
}

export default connectDB
