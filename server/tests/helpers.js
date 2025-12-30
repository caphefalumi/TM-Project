import { vi } from 'vitest'

/**
 * Create mock Express request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    cookies: {},
    headers: {},
    user: null,
    clientIp: '127.0.0.1',
    get: vi.fn((header) => overrides.headers?.[header] || ''),
    ...overrides,
  }
}

/**
 * Create mock Express response object
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    cookies: {},
  }

  res.status = vi.fn((code) => {
    res.statusCode = code
    return res
  })

  res.json = vi.fn((data) => {
    res.data = data
    return res
  })

  res.send = vi.fn((data) => {
    res.data = data
    return res
  })

  res.sendStatus = vi.fn((code) => {
    res.statusCode = code
    return res
  })

  res.cookie = vi.fn((name, value, options) => {
    res.cookies[name] = { value, options }
    return res
  })

  res.clearCookie = vi.fn((name, options) => {
    delete res.cookies[name]
    return res
  })

  return res
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    _id: { toString: () => 'user-123' },
    userId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    emailVerified: true,
    provider: 'local',
    password: '$2b$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(this),
    ...overrides,
  }
}

/**
 * Create mock admin user data
 */
export function createMockAdmin(overrides = {}) {
  return createMockUser({
    username: 'admin',
    email: 'admin@example.com',
    ...overrides,
  })
}

/**
 * Create mock team data
 */
export function createMockTeam(overrides = {}) {
  return {
    _id: { toString: () => 'team-123' },
    title: 'Test Team',
    category: 'Development',
    description: 'A test team description',
    parentTeamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(this),
    ...overrides,
  }
}

/**
 * Create mock task data
 */
export function createMockTask(overrides = {}) {
  return {
    _id: { toString: () => 'task-123' },
    userId: 'user-123',
    teamId: 'team-123',
    taskGroupId: 'group-123',
    title: 'Test Task',
    description: 'Test task description',
    category: 'Development',
    tags: ['test'],
    priority: 'Medium',
    weighted: 5,
    startDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    submitted: false,
    submissions: [],
    status: 'pending',
    design: {
      numberOfFields: 1,
      fields: [{ label: 'Description', type: 'Short text', config: { required: true } }],
    },
    save: vi.fn().mockResolvedValue(this),
    ...overrides,
  }
}

/**
 * Create mock refresh token data
 */
export function createMockRefreshToken(overrides = {}) {
  return {
    _id: { toString: () => 'token-123' },
    userId: 'user-123',
    token: 'mock-refresh-token',
    sessionId: 'session-123',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 Test Browser',
    location: 'Local',
    browser: 'Test',
    device: 'Desktop',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastActivity: new Date(),
    activityCount: 1,
    revoked: false,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date(),
    save: vi.fn().mockResolvedValue(this),
    ...overrides,
  }
}

/**
 * Create mock UsersOfTeam data
 */
export function createMockUserOfTeam(overrides = {}) {
  return {
    _id: { toString: () => 'userteam-123' },
    userId: 'user-123',
    teamId: 'team-123',
    roleType: 'member',
    roleId: null,
    customPermissions: {},
    save: vi.fn().mockResolvedValue(this),
    ...overrides,
  }
}

/**
 * Create mock Role data
 */
export function createMockRole(overrides = {}) {
  return {
    _id: { toString: () => 'role-123' },
    name: 'Custom Role',
    team_id: 'team-123',
    permissions: ['canManageTasks'],
    icon: 'mdi-star',
    color: 'blue',
    created_by: 'user-123',
    save: vi.fn().mockResolvedValue(this),
    ...overrides,
  }
}

/**
 * Wait for async operations
 */
export async function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Generate valid JWT tokens for testing
 */
export function generateTestTokens(userData = {}) {
  const jwt = require('jsonwebtoken')
  const user = {
    userId: userData.userId || 'user-123',
    username: userData.username || 'testuser',
    email: userData.email || 'test@example.com',
  }

  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

  return { accessToken, refreshToken, user }
}
