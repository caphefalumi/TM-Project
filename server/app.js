import dotenv from 'dotenv'
dotenv.config({ silent: true })
import express from 'express'
import routes from './routes/router.js'
import connectDB from './config/db.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import ExpressMongoSanitize from 'express-mongo-sanitize'
import { initTokenCleanup } from './scripts/tokenCleanup.js'
import requestIp from 'request-ip'
const app = express()
app.use(requestIp.mw())
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://tm-project-weld.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
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
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())
app.use(routes)

// Handle preflight requests for all routes
app.options('*', cors());

const PORT = process.env.PORT || 3000

// Start token cleanup scheduler
initTokenCleanup()

// For local development
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

// Export for Vercel
export default app
