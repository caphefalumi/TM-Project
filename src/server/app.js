import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import accountRoutes from './routes/index.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true, // CRITICAL for cookies to work
  }),
)
app.use(express.json())
app.use(cookieParser())
app.use(accountRoutes)

const PORT = process.env.VITE_API_PORT
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
