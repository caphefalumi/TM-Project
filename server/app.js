import dotenv from 'dotenv'
dotenv.config({ quiet: true })
import express from 'express'
import routes from './routes/router.js'
import connectDB from './config/db.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import ExpressMongoSanitize from 'express-mongo-sanitize'
import { initTokenCleanup } from './scripts/tokenCleanup.js'
import requestIp from 'request-ip'
import path from 'path'
import { csrfProtection, getCsrfToken } from './middleware/csrfMiddleware.js'

const app = express()
app.use(requestIp.mw())
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://tm-project-weld.vercel.app',
      'http://tauri.localhost',
      'https://tauri.localhost',
      'https://tm-project.id.vn',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
)
connectDB()

app.use((req, _res, next) => {
  Object.defineProperty(req, 'query', {
    ...Object.getOwnPropertyDescriptor(req, 'query'),
    value: req.query,
    writable: true,
  })

  next()
})
app.use(ExpressMongoSanitize())
app.use((req, _res, next) => {
  Object.defineProperty(req, 'query', {
    ...Object.getOwnPropertyDescriptor(req, 'query'),
    value: req.query,
    writable: false,
  })

  next()
})
// Increase payload size limit for image uploads
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))
app.use(cookieParser())
app.use(express.static('public'))

app.get('/api/csrf-token', getCsrfToken)

// Apply CSRF protection to all API routes
app.use('/api', csrfProtection)
app.use('/api', routes)

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(process.cwd(), 'public', 'notfound.html'))
})

const PORT = process.env.PORT || 3000

// Start token cleanup scheduler
// initTokenCleanup()

// For local development
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

// Export for Vercel
export default app
