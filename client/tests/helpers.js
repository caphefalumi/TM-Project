/**
 * Test Helpers and Utilities for TM Project Front-end Tests
 */

import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

/**
 * Create a test Pinia instance
 */
export function createTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Create a test router with memory history
 */
export function createTestRouter(routes = []) {
  return createRouter({
    history: createMemoryHistory(),
    routes:
      routes.length > 0
        ? routes
        : [
            { path: '/', name: 'Landing', component: { template: '<div>Landing</div>' } },
            { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
            { path: '/register', name: 'Register', component: { template: '<div>Register</div>' } },
            {
              path: '/home',
              name: 'Dashboard',
              component: { template: '<div>Dashboard</div>' },
              meta: { requiresAuth: true },
            },
            {
              path: '/teams',
              name: 'Teams',
              component: { template: '<div>Teams</div>' },
              meta: { requiresAuth: true },
            },
            {
              path: '/teams/:teamId',
              name: 'TeamDetails',
              component: { template: '<div>TeamDetails</div>' },
              meta: { requiresAuth: true },
            },
            {
              path: '/admin',
              name: 'Admin',
              component: { template: '<div>Admin</div>' },
              meta: { requiresAuth: true, requiresAdmin: true },
            },
            {
              path: '/:pathMatch(.*)*',
              name: 'NotFound',
              component: { template: '<div>404</div>' },
            },
          ],
  })
}

/**
 * Mock fetch responses
 */
export function mockFetchResponse(data, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
}

/**
 * Setup global fetch mock
 */
export function setupFetchMock() {
  global.fetch = vi.fn()
  return global.fetch
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    userId: '123',
    username: 'testuser',
    email: 'test@example.com',
    emailVerified: true,
    ...overrides,
  }
}

/**
 * Create mock admin user data
 */
export function createMockAdmin(overrides = {}) {
  return {
    userId: '1',
    username: 'admin',
    email: 'admin@example.com',
    emailVerified: true,
    ...overrides,
  }
}

/**
 * Create mock team data
 */
export function createMockTeam(overrides = {}) {
  return {
    teamId: 'team-1',
    title: 'Test Team',
    description: 'A test team',
    category: 'Development',
    createdAt: '2024-01-01',
    ...overrides,
  }
}

/**
 * Create mock task data
 */
export function createMockTask(overrides = {}) {
  return {
    taskId: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    category: 'Report',
    priority: 'Medium',
    weighted: 5,
    startDate: '2024-01-01',
    dueDate: '2024-12-31',
    teamId: 'team-1',
    taskGroupId: 'group-1',
    design: {
      numberOfFields: 0,
      fields: [],
    },
    assignees: [],
    ...overrides,
  }
}

/**
 * Create mock announcement data
 */
export function createMockAnnouncement(overrides = {}) {
  return {
    announcementId: 'announcement-1',
    title: 'Test Announcement',
    content: 'Test content',
    createdBy: 'testuser',
    createdAt: '2024-01-01',
    teamId: 'team-1',
    ...overrides,
  }
}

/**
 * Create mock team member data
 */
export function createMockTeamMember(overrides = {}) {
  return {
    userId: '123',
    username: 'testuser',
    email: 'test@example.com',
    roleType: 'member',
    joinedAt: '2024-01-01',
    ...overrides,
  }
}

/**
 * Create mock permissions data
 */
export function createMockPermissions(overrides = {}) {
  return {
    canViewTeam: true,
    canViewTasks: true,
    canViewAnnouncements: true,
    canViewMembers: true,
    canSubmitTasks: true,
    canManageTasks: false,
    canDeleteTasks: false,
    canManageAnnouncements: false,
    canDeleteAnnouncements: false,
    canAddMembers: false,
    canRemoveMembers: false,
    canDeleteTeams: false,
    canCreateSubTeams: false,
    canManageCustomRoles: false,
    ...overrides,
  }
}

/**
 * Create mock task design with various field types
 */
export function createMockTaskDesign(fieldTypes = []) {
  const fields = fieldTypes.map((type, index) => {
    const baseField = {
      label: `Field ${index + 1}`,
      type,
      config: {
        required: false,
      },
    }

    switch (type.toLowerCase()) {
      case 'number':
        return {
          ...baseField,
          config: {
            ...baseField.config,
            min: 0,
            max: 100,
          },
        }
      case 'select':
        return {
          ...baseField,
          config: {
            ...baseField.config,
            options: ['Option 1', 'Option 2', 'Option 3'],
          },
        }
      case 'image':
        return {
          ...baseField,
          config: {
            ...baseField.config,
            maxSize: 5242880, // 5MB
            acceptedTypes: ['image/jpeg', 'image/png', 'image/gif'],
          },
        }
      default:
        return baseField
    }
  })

  return {
    numberOfFields: fields.length,
    fields,
  }
}

/**
 * Wait for promises to resolve
 */
export async function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Mock FileReader for image upload tests
 */
export function mockFileReader() {
  const mockFileReader = {
    readAsDataURL: vi.fn(function () {
      this.onload?.({
        target: {
          result:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      })
    }),
  }

  global.FileReader = vi.fn(() => mockFileReader)
  return mockFileReader
}

/**
 * Create mock canvas for image processing tests
 */
export function mockCanvas() {
  const canvas = {
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
    })),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    width: 0,
    height: 0,
  }

  global.HTMLCanvasElement.prototype.getContext = canvas.getContext
  global.HTMLCanvasElement.prototype.toDataURL = canvas.toDataURL

  return canvas
}

/**
 * Mock Tauri open function
 */
export function mockTauriOpen() {
  const openMock = vi.fn()
  vi.doMock('@tauri-apps/plugin-shell', () => ({
    open: openMock,
  }))
  return openMock
}

/**
 * Setup OAuth polling mock
 */
export function setupOAuthPollingMock(fetchMock, statusResponses = []) {
  let callCount = 0

  fetchMock.mockImplementation((url) => {
    if (url.includes('/api/auth/oauth/status')) {
      const response = statusResponses[callCount] || { status: 'pending' }
      callCount++
      return mockFetchResponse(response)
    }
    return mockFetchResponse({ error: 'Not found' }, false, 404)
  })

  return { callCount: () => callCount }
}

/**
 * Create mock vuetify instance for mounting components
 */
export function createVuetify() {
  return {
    install: (app) => {
      // Mock vuetify installation
    },
  }
}

/**
 * Assert navigation to a specific route
 */
export function assertNavigatedTo(router, path) {
  const currentPath = router.currentRoute.value.path
  return currentPath === path
}

/**
 * Advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms) {
  vi.advanceTimersByTime(ms)
  await flushPromises()
}
