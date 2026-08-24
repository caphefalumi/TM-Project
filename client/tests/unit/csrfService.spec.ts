import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addCsrfHeader,
  fetchCsrfToken,
  getCsrfToken,
  resetCsrfToken,
} from '../../src/services/csrfService.ts'

describe('csrfService', () => {
  beforeEach(() => {
    resetCsrfToken()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    resetCsrfToken()
  })

  it('fetches and caches the CSRF token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'token-1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = await getCsrfToken()
    const second = await getCsrfToken()
    expect(first).toBe('token-1')
    expect(second).toBe('token-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('adds the token header when one is stored', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'abc' }),
      }),
    )
    await fetchCsrfToken()
    expect(addCsrfHeader({ Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
      'x-csrf-token': 'abc',
    })
  })

  it('returns original headers when no token is stored', () => {
    expect(addCsrfHeader({ Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
    })
  })
})
