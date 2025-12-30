import { vi, beforeEach, afterEach } from 'vitest'

// Mock environment variables
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret'
process.env.JWT_ACCESS_TOKEN_TIME = '15m'
process.env.JWT_REFRESH_TOKEN_TIME = '7d'
process.env.ACCESS_TOKEN_TIME = '900000'
process.env.REFRESH_TOKEN_TIME = '604800000'
process.env.CLIENT_URL = 'http://localhost:5173'
process.env.MAILERSEND_API_KEY = 'test-mailersend-api-key'
process.env.NODE_ENV = 'test'

// Mock mongoose connection
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose')
  return {
    ...actual,
    connect: vi.fn().mockResolvedValue({}),
    connection: {
      on: vi.fn(),
      once: vi.fn(),
      readyState: 1,
    },
  }
})

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})
