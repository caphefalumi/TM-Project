import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../../src/stores/auth.ts'

vi.mock('../../src/scripts/apiClient.ts', () => ({
  fetchWithTokenRefresh: vi.fn(),
}))

vi.mock('../../src/composables/useComponentCache.ts', () => ({
  useComponentCache: () => ({
    clearAllCaches: vi.fn(),
  }),
}))

import { fetchWithTokenRefresh } from '../../src/scripts/apiClient.ts'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  }
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchWithTokenRefresh).mockReset()
  })

  it('normalizes API user payloads', () => {
    const store = useAuthStore()
    const user = store.setUserFromApi({
      userId: 42,
      username: 'ada',
      email: 'ada@example.com',
    })
    expect(user).toMatchObject({
      userId: '42',
      username: 'ada',
      email: 'ada@example.com',
      emailVerified: true,
    })
    expect(store.isLoggedIn).toBe(true)
  })

  it('clears auth state', () => {
    const store = useAuthStore()
    store.setUserFromApi({ userId: '1', username: 'ada', email: 'a@b.c' })
    store.clearAuth()
    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
  })

  it('fetches the current user through the API client', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse({ user: { userId: '9', username: 'ada', email: 'a@b.c' } }) as Response,
    )
    const store = useAuthStore()
    const user = await store.fetchUser()
    expect(user?.username).toBe('ada')
    expect(store.hasUser).toBe(true)
  })

  it('logs out and clears local auth', async () => {
    vi.mocked(fetchWithTokenRefresh)
      .mockResolvedValueOnce(
        jsonResponse({ user: { userId: '9', username: 'ada', email: 'a@b.c' } }) as Response,
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'Logged out' }) as Response)

    const store = useAuthStore()
    const result = await store.logout()
    expect(result.success).toBe(true)
    expect(store.isLoggedIn).toBe(false)
  })
})
