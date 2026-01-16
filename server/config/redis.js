import { createClient } from 'redis'

let redisClient = null
let isConnected = false

const REDIS_CONFIG = {
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    tls: process.env.REDIS_TLS !== 'false', // Enable TLS by default for cloud Redis
    connectTimeout: 10000, // 10 seconds connection timeout
    // Reject unauthorized certificates in production, but allow self-signed for development
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log('Redis: Max reconnection attempts reached')
        return new Error('Max reconnection attempts reached')
      }
      const delay = Math.min(retries * 100, 3000) // Max 3 seconds
      console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})...`)
      return delay
    },
  },
}

export const initRedis = async () => {
  // Skip Redis if disabled in env
  if (process.env.REDIS_CACHE_ENABLED === 'false') {
    console.log('Redis: Caching disabled via REDIS_CACHE_ENABLED=false')
    return null
  }

  // Skip Redis if credentials are missing
  if (!process.env.REDIS_HOST || !process.env.REDIS_PASSWORD) {
    console.log('Redis: Credentials not found, running without Redis (using memory fallback)')
    return null
  }

  try {
    console.log(
      `Redis: Attempting to connect to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    )
    redisClient = createClient(REDIS_CONFIG)

    // Error handler
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message)
      isConnected = false
    })

    // Connection handler
    redisClient.on('connect', () => {
      console.log('Redis: TCP connection established')
    })

    redisClient.on('ready', () => {
      console.log('Redis: Connected and ready!')
      isConnected = true
    })

    redisClient.on('reconnecting', () => {
      console.log('Redis: Attempting to reconnect...')
      isConnected = false
    })

    redisClient.on('end', () => {
      console.log('Redis: Connection closed')
      isConnected = false
    })

    // Connect to Redis with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15000)),
    ])

    console.log('Redis: Successfully connected!')
    return redisClient
  } catch (error) {
    console.error('Redis: Failed to connect:', error.message)
    console.log('Redis: Continuing without Redis (using memory fallback)')
    redisClient = null
    isConnected = false
    return null
  }
}

export const getRedisClient = () => {
  return redisClient
}

export const isRedisReady = () => {
  return isConnected && redisClient && redisClient.isReady
}

export const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit()
      console.log('Redis: Connection closed gracefully')
    } catch (error) {
      console.error('Redis: Error closing connection:', error.message)
    }
  }
}

export default {
  initRedis,
  getRedisClient,
  isRedisReady,
  closeRedis,
}
