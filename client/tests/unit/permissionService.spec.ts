import { beforeEach, describe, expect, it, vi } from 'vitest'
import { permissionService } from '../../src/services/permissionService.ts'

vi.mock('../../src/scripts/apiClient.ts', () => ({
  fetchJSON: vi.fn(),
}))

import { fetchJSON } from '../../src/scripts/apiClient.ts'

describe('permissionService', () => {
  beforeEach(() => {
    permissionService.reset()
    vi.mocked(fetchJSON).mockReset()
  })

  it('defaults to member permissions', () => {
    expect(permissionService.canViewTeam()).toBe(false)
    expect(permissionService.isAdmin()).toBe(false)
    expect(permissionService.getRole()).toBe('Member')
  })

  it('applies backend-computed actions', () => {
    permissionService.setUserActions({
      canViewTeam: true,
      canManageTasks: true,
      roleType: 'admin',
      roleLabel: 'Admin',
      isGlobalAdmin: false,
    })
    expect(permissionService.canViewTeam()).toBe(true)
    expect(permissionService.canManageTasks()).toBe(true)
    expect(permissionService.canDeleteTeams()).toBe(false)
    expect(permissionService.isAdmin()).toBe(true)
    expect(permissionService.getRole()).toBe('Admin')
  })

  it('fetches and stores user actions from the API', async () => {
    vi.mocked(fetchJSON).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      data: { canViewTeam: true, canAddMembers: true, roleLabel: 'Reviewer' },
    })
    const data = await permissionService.fetchUserActions('team-1', 'user-1')
    expect(data.canAddMembers).toBe(true)
    expect(permissionService.canAddMembers()).toBe(true)
    expect(permissionService.getRole()).toBe('Reviewer')
  })

  it('returns icon and color helpers for three-state permissions', () => {
    expect(permissionService.getPermissionIcon(null)).toBe('mdi-minus')
    expect(permissionService.getPermissionIcon(true)).toBe('mdi-check')
    expect(permissionService.getPermissionColor(false)).toBe('error')
    expect(permissionService.getRoleIcon('admin')).toBe('mdi-crown')
  })
})
