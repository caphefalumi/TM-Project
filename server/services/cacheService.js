import { getRedisClient, isRedisReady } from '../config/redis.js'

// In-memory fallback cache
class MemoryCache {
  constructor() {
    this.cache = new Map()
    this.timers = new Map()
  }

  async get(key) {
    return this.cache.get(key) || null
  }

  async set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value)

    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }

    // Set expiration timer
    if (ttlSeconds > 0) {
      const timer = setTimeout(() => {
        this.cache.delete(key)
        this.timers.delete(key)
      }, ttlSeconds * 1000)
      this.timers.set(key, timer)
    }

    return 'OK'
  }

  async del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
      this.timers.delete(key)
    }
    return this.cache.delete(key) ? 1 : 0
  }

  async keys(pattern) {
    // Simple pattern matching for wildcard (*)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return Array.from(this.cache.keys()).filter((key) => regex.test(key))
  }

  async delPattern(pattern) {
    const matchingKeys = await this.keys(pattern)
    let count = 0
    for (const key of matchingKeys) {
      count += await this.del(key)
    }
    return count
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.cache.clear()
    this.timers.clear()
  }

  size() {
    return this.cache.size
  }
}

// Create singleton memory cache instance
const memoryCache = new MemoryCache()

// Cache service with automatic Redis/Memory fallback
class CacheService {
  async get(key) {
    try {
      if (isRedisReady()) {
        const client = getRedisClient()
        const value = await client.get(key)
        return value ? JSON.parse(value) : null
      } else {
        const value = await memoryCache.get(key)
        return value
      }
    } catch (error) {
      console.error('Cache get error:', error.message)
      // Fallback to memory cache on Redis error
      return await memoryCache.get(key)
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      const serializedValue = JSON.stringify(value)

      if (isRedisReady()) {
        const client = getRedisClient()
        if (ttlSeconds > 0) {
          await client.setEx(key, ttlSeconds, serializedValue)
        } else {
          await client.set(key, serializedValue)
        }
      } else {
        await memoryCache.set(key, value, ttlSeconds)
      }
      return 'OK'
    } catch (error) {
      console.error('Cache set error:', error.message)
      // Fallback to memory cache on Redis error
      return await memoryCache.set(key, value, ttlSeconds)
    }
  }

  async del(key) {
    try {
      if (isRedisReady()) {
        const client = getRedisClient()
        return await client.del(key)
      } else {
        return await memoryCache.del(key)
      }
    } catch (error) {
      console.error('Cache delete error:', error.message)
      return await memoryCache.del(key)
    }
  }

  async delPattern(pattern) {
    try {
      if (isRedisReady()) {
        const client = getRedisClient()
        const keys = await client.keys(pattern)
        if (keys.length > 0) {
          return await client.del(keys)
        }
        return 0
      } else {
        return await memoryCache.delPattern(pattern)
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error.message)
      return await memoryCache.delPattern(pattern)
    }
  }

  async exists(key) {
    try {
      if (isRedisReady()) {
        const client = getRedisClient()
        return await client.exists(key)
      } else {
        const value = await memoryCache.get(key)
        return value !== null ? 1 : 0
      }
    } catch (error) {
      console.error('Cache exists error:', error.message)
      return 0
    }
  }

  async clear() {
    try {
      if (isRedisReady()) {
        const client = getRedisClient()
        return await client.flushDb()
      } else {
        memoryCache.clear()
        return 'OK'
      }
    } catch (error) {
      console.error('Cache clear error:', error.message)
      memoryCache.clear()
      return 'OK'
    }
  }

  getStats() {
    return {
      backend: isRedisReady() ? 'redis' : 'memory',
      memorySize: memoryCache.size(),
      redisConnected: isRedisReady(),
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService()

export default cacheService
