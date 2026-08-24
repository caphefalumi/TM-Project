import { describe, it, expect } from 'vitest'
import {
  ROLES,
  getBaseRoleFromRoleType,
  getRoleLabel,
  getRoleDefaultPermissions,
} from '../../middleware/roleMiddleware.ts'
import { PERMISSIONS } from '../../config/permissions.ts'

describe('role helpers', () => {
  it('maps role types onto base roles', () => {
    expect(getBaseRoleFromRoleType(ROLES.ADMIN)).toBe('Admin')
    expect(getBaseRoleFromRoleType(ROLES.MEMBER)).toBe('Member')
    expect(getBaseRoleFromRoleType(ROLES.CUSTOM)).toBe('Member')
    expect(getBaseRoleFromRoleType(undefined)).toBe('Member')
  })

  it('uses a custom role name as the label', () => {
    expect(getRoleLabel(ROLES.CUSTOM, { name: 'Reviewer' })).toBe('Reviewer')
    expect(getRoleLabel(ROLES.ADMIN, null)).toBe('Admin')
  })

  it('returns all permissions for Admin and basics for Member', () => {
    const admin = getRoleDefaultPermissions('Admin')
    const member = getRoleDefaultPermissions('Member')
    expect(admin[PERMISSIONS.DELETE_TEAMS]).toBe(true)
    expect(admin[PERMISSIONS.VIEW_TEAM]).toBe(true)
    expect(member[PERMISSIONS.VIEW_TEAM]).toBe(true)
    expect(member[PERMISSIONS.DELETE_TEAMS]).toBe(false)
  })
})
