import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING)

    console.log(process.env.DB_CONNECTION_STRING)
    console.log('MongoDB Connected...')
  } catch (err) {
    console.error('Database connection error:', err)
    process.exit(1)
  }
}

export default connectDB
