import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJSON, fetchWithTokenRefresh } from '../../src/scripts/apiClient.ts'
import { resetCsrfToken } from '../../src/services/csrfService.ts'
import { mockFetchResponse, setupFetchMock } from '../helpers.ts'

vi.mock('../../src/composables/useComponentCache.ts', () => ({
  useComponentCache: () => ({
    clearAllCaches: vi.fn(),
  }),
}))

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof setupFetchMock>

  beforeEach(() => {
    resetCsrfToken()
    fetchMock = setupFetchMock()
  })

  it('returns a fetch-like Response for successful requests', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse({ teams: [] }))
    const response = await fetchWithTokenRefresh('/api/teams', { method: 'GET' })
    expect(response.ok).toBe(true)
    expect(await response.json()).toEqual({ teams: [] })
  })

  it('attaches a CSRF token on mutations', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/api/csrf-token')) {
        return mockFetchResponse({ csrfToken: 'csrf-test' })
      }
      return mockFetchResponse({ ok: true }, true, 201)
    })

    await fetchWithTokenRefresh('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Team' }),
    })

    const mutationCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/teams'))
    expect(mutationCall?.[1]?.headers).toEqual(
      expect.objectContaining({ 'x-csrf-token': 'csrf-test' }),
    )
  })

  it('refreshes the CSRF token and retries once on 403 CSRF errors', async () => {
    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ csrfToken: 'csrf-1' }))
      .mockResolvedValueOnce(mockFetchResponse({ error: 'CSRF token missing' }, false, 403))
      .mockResolvedValueOnce(mockFetchResponse({ csrfToken: 'csrf-2' }))
      .mockResolvedValueOnce(mockFetchResponse({ ok: true }))

    const response = await fetchWithTokenRefresh('/api/teams', { method: 'POST' })
    expect(response.ok).toBe(true)
  })

  it('refreshes the access token and retries once on 401', async () => {
    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ error: 'expired' }, false, 401))
      .mockResolvedValueOnce(mockFetchResponse({ ok: true }))
      .mockResolvedValueOnce(mockFetchResponse({ teams: [1] }))

    const response = await fetchWithTokenRefresh('/api/teams', { method: 'GET' })
    expect(response.ok).toBe(true)
    expect(await response.json()).toEqual({ teams: [1] })
  })

  it('parses JSON through fetchJSON', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse({ user: { id: 1 } }))
    const result = await fetchJSON('/api/users')
    expect(result).toMatchObject({ ok: true, status: 200, data: { user: { id: 1 } } })
  })
})
