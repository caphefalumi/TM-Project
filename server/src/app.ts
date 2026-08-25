import dotenv from 'dotenv'
dotenv.config({ quiet: true })
import express from 'express'
import routes from './shared/router.js'
import connectDB from './shared/config/db.config.js'
import { initRedis } from './shared/config/redis.config.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import ExpressMongoSanitize from 'express-mongo-sanitize'
import { initTokenCleanup } from './shared/jobs/token-cleanup.job.js'
import requestIp from 'request-ip'
import path from 'path'
import { csrfProtection, getCsrfToken } from './shared/middleware/csrf.middleware.js'

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

const isTestEnv = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

if (!isTestEnv) {
  connectDB()
}

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
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))
app.use(cookieParser())
app.use(express.static('public'))

app.get('/api/csrf-token', getCsrfToken)

app.use('/api', csrfProtection)
app.use('/api', routes)

app.use((req, res) => {
  res.status(404).sendFile(path.join(process.cwd(), 'public', 'notfound.html'))
})

const PORT = process.env.PORT || 3000

// initTokenCleanup()

if (!isTestEnv) {
  const redisReady = initRedis()
  redisReady.then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  })
}

export default app
