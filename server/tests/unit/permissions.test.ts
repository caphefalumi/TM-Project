import { describe, it, expect } from 'vitest'
import { PERMISSIONS, ROLE_PERMISSIONS, computeUserActions } from '../../config/permissions.ts'

describe('permissions config', () => {
  it('exposes a stable permission catalog', () => {
    expect(PERMISSIONS.VIEW_TEAM).toBe('canViewTeam')
    expect(PERMISSIONS.MANAGE_TASKS).toBe('canManageTasks')
    expect(PERMISSIONS.DELETE_TEAMS).toBe('canDeleteTeams')
  })

  it('gives admins every permission', () => {
    expect(ROLE_PERMISSIONS.Admin).toEqual(Object.values(PERMISSIONS))
  })

  it('gives members only basic permissions', () => {
    expect(ROLE_PERMISSIONS.Member).toEqual([
      PERMISSIONS.VIEW_TEAM,
      PERMISSIONS.VIEW_TASKS,
      PERMISSIONS.VIEW_ANNOUNCEMENTS,
      PERMISSIONS.VIEW_MEMBERS,
      PERMISSIONS.SUBMIT_TASKS,
    ])
  })

  it('computes default view actions even when no extras are granted', () => {
    const actions = computeUserActions({})
    expect(actions.canViewTeam).toBe(true)
    expect(actions.canSubmitTasks).toBe(true)
    expect(actions.canManageTasks).toBe(false)
    expect(actions.canDeleteTeams).toBe(false)
  })

  it('maps granted custom permissions onto computed actions', () => {
    const actions = computeUserActions({
      [PERMISSIONS.MANAGE_TASKS]: true,
      [PERMISSIONS.ADD_MEMBERS]: true,
    })
    expect(actions.canManageTasks).toBe(true)
    expect(actions.canAddMembers).toBe(true)
    expect(actions.canDeleteTasks).toBe(false)
  })
})
