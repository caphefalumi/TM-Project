import { beforeEach, describe, expect, it, vi } from 'vitest'
import sessionService from '../../src/services/sessionService.ts'

vi.mock('../../src/scripts/apiClient.ts', () => ({
  fetchWithTokenRefresh: vi.fn(),
}))

import { fetchWithTokenRefresh } from '../../src/scripts/apiClient.ts'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
  }
}

describe('sessionService', () => {
  beforeEach(() => {
    vi.mocked(fetchWithTokenRefresh).mockReset()
    sessionService.clearWarnings()
    sessionService.stopActivityMonitoring()
  })

  it('loads active sessions', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse({ sessions: [{ id: 's1' }] }) as Response,
    )
    const result = await sessionService.getActiveSessions()
    expect(result.success).toBe(true)
    expect(result.sessions).toEqual([{ id: 's1' }])
  })

  it('records security warnings for suspicious activity', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse({ isSuspicious: true, uniqueIPs: 4 }) as Response,
    )
    const result = await sessionService.checkSecurity()
    expect(result.success).toBe(true)
    expect(sessionService.hasWarnings()).toBe(true)
    expect(sessionService.getWarnings()).toEqual(
      expect.arrayContaining(['suspicious_activity', 'multiple_locations']),
    )
  })

  it('formats local and private IP addresses', () => {
    expect(sessionService.formatIpAddress('127.0.0.1')).toBe('Local Development')
    expect(sessionService.formatIpAddress('192.168.0.8')).toBe('Private Network')
    expect(sessionService.formatIpAddress('8.8.8.8')).toBe('IP: 8.8.8.8')
  })

  it('formats relative session timestamps', () => {
    const info = sessionService.formatSessionInfo({
      lastActivity: new Date().toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    })
    expect(info.lastActivityFormatted).toBe('Just now')
    expect(info.createdAtFormatted).toBe('2h ago')
  })
})
