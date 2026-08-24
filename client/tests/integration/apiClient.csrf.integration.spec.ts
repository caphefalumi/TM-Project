import { beforeEach, describe, expect, it } from 'vitest'
import { fetchWithTokenRefresh } from '../../src/scripts/apiClient.ts'
import { resetCsrfToken } from '../../src/services/csrfService.ts'
import { mockFetchResponse, setupFetchMock } from '../helpers.ts'

describe('apiClient CSRF integration', () => {
  beforeEach(() => {
    resetCsrfToken()
  })

  it('fetches a CSRF token before the first mutation, then reuses it', async () => {
    const fetchMock = setupFetchMock()
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/api/csrf-token')) {
        return mockFetchResponse({ csrfToken: 'csrf-live' })
      }
      return mockFetchResponse({ ok: true })
    })

    await fetchWithTokenRefresh('/api/teams', { method: 'POST', body: '{}' })
    await fetchWithTokenRefresh('/api/teams', { method: 'POST', body: '{}' })

    const csrfCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/csrf-token'))
    const teamCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/teams'))
    expect(csrfCalls).toHaveLength(1)
    expect(teamCalls).toHaveLength(2)
    expect(teamCalls[0][1].headers['x-csrf-token']).toBe('csrf-live')
    expect(teamCalls[1][1].headers['x-csrf-token']).toBe('csrf-live')
  })
})
