import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import accountRoutes from './routes/index.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://tm-demo-gamma.vercel.app'],
    credentials: true, // CRITICAL for cookies to work
  }),
)
// Increase payload size limit for image uploads
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())
app.use(accountRoutes)

const PORT = process.env.PORT || 3000

// For local development
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })

// Export for Vercel
export default app
