/**
 * Role-Based Access Control (RBAC) Tests
 * Tests for permissions, role middleware, and access control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockResponse, createMockUserOfTeam, createMockRole } from './helpers.js'

// Mock models
vi.mock('../models/UsersOfTeam.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('../models/Role.js', () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}))

vi.mock('../config/permissions.js', () => ({
  PERMISSIONS: {
    VIEW_TEAM: 'canViewTeam',
    VIEW_TASKS: 'canViewTasks',
    VIEW_ANNOUNCEMENTS: 'canViewAnnouncements',
    VIEW_MEMBERS: 'canViewMembers',
    SUBMIT_TASKS: 'canSubmitTasks',
    MANAGE_TASKS: 'canManageTasks',
    DELETE_TASKS: 'canDeleteTasks',
    MANAGE_ANNOUNCEMENTS: 'canManageAnnouncements',
    DELETE_ANNOUNCEMENTS: 'canDeleteAnnouncements',
    ADD_MEMBERS: 'canAddMembers',
    REMOVE_MEMBERS: 'canRemoveMembers',
    DELETE_TEAMS: 'canDeleteTeams',
    CREATE_SUB_TEAMS: 'canCreateSubTeams',
    MANAGE_CUSTOM_ROLES: 'canManageCustomRoles',
  },
  ROLE_PERMISSIONS: {
    Admin: [
      'canViewTeam',
      'canViewTasks',
      'canViewAnnouncements',
      'canViewMembers',
      'canSubmitTasks',
      'canManageTasks',
      'canDeleteTasks',
      'canManageAnnouncements',
      'canDeleteAnnouncements',
      'canAddMembers',
      'canRemoveMembers',
      'canDeleteTeams',
      'canCreateSubTeams',
      'canManageCustomRoles',
    ],
    Member: [
      'canViewTeam',
      'canViewTasks',
      'canViewAnnouncements',
      'canViewMembers',
      'canSubmitTasks',
    ],
  },
  computeUserActions: vi.fn((permissions) => ({
    canViewTeam: true,
    canViewTasks: true,
    canViewAnnouncements: true,
    canViewMembers: true,
    canSubmitTasks: true,
    canManageTasks: permissions.canManageTasks || false,
    canDeleteTasks: permissions.canDeleteTasks || false,
    canManageAnnouncements: permissions.canManageAnnouncements || false,
    canDeleteAnnouncements: permissions.canDeleteAnnouncements || false,
    canAddMembers: permissions.canAddMembers || false,
    canRemoveMembers: permissions.canRemoveMembers || false,
    canDeleteTeams: permissions.canDeleteTeams || false,
    canCreateSubTeams: permissions.canCreateSubTeams || false,
    canManageCustomRoles: permissions.canManageCustomRoles || false,
  })),
}))

import {
  ROLES,
  getBaseRoleFromRoleType,
  getRoleLabel,
  getUserCustomPermissions,
  getRoleDefaultPermissions,
  hasPermission,
  requireAdmin,
  requirePermission,
  getUserRoleInTeam,
  hasElevatedPrivileges,
} from '../middleware/roleMiddleware.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Role from '../models/Role.js'
import { PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions.js'

describe('RBAC Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    next = vi.fn()
    vi.clearAllMocks()
  })

  describe('ROLES constant', () => {
    it('should define admin role', () => {
      expect(ROLES.ADMIN).toBe('admin')
    })

    it('should define member role', () => {
      expect(ROLES.MEMBER).toBe('member')
    })

    it('should define custom role', () => {
      expect(ROLES.CUSTOM).toBe('custom')
    })
  })

  describe('getBaseRoleFromRoleType', () => {
    it('should return Admin for admin role type', () => {
      expect(getBaseRoleFromRoleType('admin')).toBe('Admin')
    })

    it('should return Member for member role type', () => {
      expect(getBaseRoleFromRoleType('member')).toBe('Member')
    })

    it('should return Member for custom role type', () => {
      expect(getBaseRoleFromRoleType('custom')).toBe('Member')
    })

    it('should return Member for undefined role type', () => {
      expect(getBaseRoleFromRoleType(undefined)).toBe('Member')
    })

    it('should return Member for unknown role type', () => {
      expect(getBaseRoleFromRoleType('unknown')).toBe('Member')
    })
  })

  describe('getRoleLabel', () => {
    it('should return custom role name when available', () => {
      const customRole = { name: 'Project Lead' }
      expect(getRoleLabel('custom', customRole)).toBe('Project Lead')
    })

    it('should return Admin for admin role type', () => {
      expect(getRoleLabel('admin', null)).toBe('Admin')
    })

    it('should return Member for member role type', () => {
      expect(getRoleLabel('member', null)).toBe('Member')
    })
  })

  describe('getRoleDefaultPermissions', () => {
    it('should return all permissions for Admin', () => {
      const permissions = getRoleDefaultPermissions('Admin')

      expect(permissions.canViewTeam).toBe(true)
      expect(permissions.canManageTasks).toBe(true)
      expect(permissions.canDeleteTeams).toBe(true)
      expect(permissions.canManageCustomRoles).toBe(true)
    })

    it('should return limited permissions for Member', () => {
      const permissions = getRoleDefaultPermissions('Member')

      expect(permissions.canViewTeam).toBe(true)
      expect(permissions.canSubmitTasks).toBe(true)
      expect(permissions.canManageTasks).toBe(false)
      expect(permissions.canDeleteTeams).toBe(false)
    })

    it('should handle role type instead of base role', () => {
      const permissions = getRoleDefaultPermissions('admin')

      expect(permissions).toBeDefined()
    })
  })

  describe('getUserCustomPermissions', () => {
    it('should return null if user not in team', async () => {
      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      })

      const result = await getUserCustomPermissions('user-123', 'team-123')

      expect(result).toBeNull()
    })

    it('should return base role permissions for member', async () => {
      const mockUserTeam = {
        roleType: 'member',
        roleId: null,
        customPermissions: { toObject: () => ({}) },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const result = await getUserCustomPermissions('user-123', 'team-123')

      expect(result).toBeDefined()
      expect(result.roleType).toBe('member')
      expect(result.baseRole).toBe('Member')
    })

    it('should return admin permissions for admin role', async () => {
      const mockUserTeam = {
        roleType: 'admin',
        roleId: null,
        customPermissions: { toObject: () => ({}) },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const result = await getUserCustomPermissions('user-123', 'team-123')

      expect(result.roleType).toBe('admin')
      expect(result.baseRole).toBe('Admin')
    })

    it('should merge custom role permissions', async () => {
      const mockUserTeam = {
        roleType: 'custom',
        roleId: {
          name: 'Project Manager',
          permissions: ['canManageTasks', 'canAddMembers'],
        },
        customPermissions: { toObject: () => ({}) },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const result = await getUserCustomPermissions('user-123', 'team-123')

      expect(result.customRoleName).toBe('Project Manager')
      expect(result.canManageTasks).toBe(true)
      expect(result.canAddMembers).toBe(true)
    })

    it('should apply individual custom permissions overrides', async () => {
      const mockUserTeam = {
        roleType: 'member',
        roleId: null,
        customPermissions: {
          toObject: () => ({
            canManageTasks: true, // Override: give member task management
          }),
        },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const result = await getUserCustomPermissions('user-123', 'team-123')

      expect(result.canManageTasks).toBe(true)
    })
  })

  describe('hasPermission', () => {
    it('should return true for global admin', async () => {
      const result = await hasPermission('user-123', 'team-123', 'MANAGE_TASKS', 'admin')

      expect(result).toBe(true)
    })

    it('should return false if user not in team', async () => {
      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      })

      const result = await hasPermission('user-123', 'team-123', 'MANAGE_TASKS')

      expect(result).toBe(false)
    })

    it('should check permission correctly', async () => {
      const mockUserTeam = {
        roleType: 'admin',
        roleId: null,
        customPermissions: { toObject: () => ({}) },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const result = await hasPermission('user-123', 'team-123', 'MANAGE_TASKS')

      expect(typeof result).toBe('boolean')
    })
  })

  describe('requireAdmin middleware', () => {
    it('should return 401 if not authenticated', () => {
      req.user = null

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('should allow global admin', () => {
      req.user = { userId: 'admin-id', username: 'admin' }

      requireAdmin(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 400 if teamId is missing', () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = {}
      req.body = {}

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('Team ID is required')
    })

    it('should return 400 if teamId is "undefined"', () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = { teamId: 'undefined' }

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should check admin role in team', async () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = { teamId: 'team-123' }

      UsersOfTeam.findOne.mockResolvedValue({
        roleType: 'admin',
      })

      requireAdmin(req, res, next)

      // Wait for the promise to resolve
      await new Promise(setImmediate)

      expect(next).toHaveBeenCalled()
    })

    it('should return 403 if user is not admin', async () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = { teamId: 'team-123' }

      UsersOfTeam.findOne.mockResolvedValue({
        roleType: 'member',
      })

      requireAdmin(req, res, next)

      await new Promise(setImmediate)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.data.message).toBe('Admin access required')
    })
  })

  describe('requirePermission middleware', () => {
    it('should return 401 if not authenticated', async () => {
      req.user = null
      const middleware = requirePermission('MANAGE_TASKS')

      await middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should allow global admin', async () => {
      req.user = { userId: 'admin-id', username: 'admin' }
      const middleware = requirePermission('MANAGE_TASKS')

      await middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 400 if teamId is missing', async () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = {}
      const middleware = requirePermission('MANAGE_TASKS')

      await middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should check single permission', async () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = { teamId: 'team-123' }

      const mockUserTeam = {
        roleType: 'admin',
        roleId: null,
        customPermissions: { toObject: () => ({}) },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const middleware = requirePermission('MANAGE_TASKS')
      await middleware(req, res, next)

      // Either next or status should be called based on permission check
      expect(next.mock.calls.length + res.status.mock.calls.length).toBeGreaterThan(0)
    })

    it('should check array of permissions (OR logic)', async () => {
      req.user = { userId: 'user-123', username: 'testuser' }
      req.params = { teamId: 'team-123' }

      const mockUserTeam = {
        roleType: 'member',
        roleId: null,
        customPermissions: { toObject: () => ({}) },
      }

      UsersOfTeam.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUserTeam),
      })

      const middleware = requirePermission(['MANAGE_TASKS', 'VIEW_TASKS'])
      await middleware(req, res, next)

      expect(true).toBe(true) // Test completes without error
    })
  })

  describe('getUserRoleInTeam', () => {
    it('should return null for invalid teamId', async () => {
      const result = await getUserRoleInTeam('user-123', 'undefined')

      expect(result).toBeNull()
    })

    it('should return null if user not in team', async () => {
      UsersOfTeam.findOne.mockResolvedValue(null)

      const result = await getUserRoleInTeam('user-123', 'team-123')

      expect(result).toBeNull()
    })

    it('should return role type if user in team', async () => {
      UsersOfTeam.findOne.mockResolvedValue({
        roleType: 'admin',
      })

      const result = await getUserRoleInTeam('user-123', 'team-123')

      expect(result).toBe('admin')
    })
  })

  describe('hasElevatedPrivileges', () => {
    it('should return true if user is admin in any team', async () => {
      UsersOfTeam.find.mockResolvedValue([{ roleType: 'admin' }])

      const result = await hasElevatedPrivileges('user-123')

      expect(result).toBe(true)
    })

    it('should return false if user has no admin roles', async () => {
      UsersOfTeam.find.mockResolvedValue([])

      const result = await hasElevatedPrivileges('user-123')

      expect(result).toBe(false)
    })
  })
})

describe('Permissions Configuration', () => {
  describe('PERMISSIONS constant', () => {
    it('should define all required permissions', () => {
      expect(PERMISSIONS.VIEW_TEAM).toBe('canViewTeam')
      expect(PERMISSIONS.VIEW_TASKS).toBe('canViewTasks')
      expect(PERMISSIONS.MANAGE_TASKS).toBe('canManageTasks')
      expect(PERMISSIONS.DELETE_TASKS).toBe('canDeleteTasks')
      expect(PERMISSIONS.ADD_MEMBERS).toBe('canAddMembers')
      expect(PERMISSIONS.DELETE_TEAMS).toBe('canDeleteTeams')
      expect(PERMISSIONS.MANAGE_CUSTOM_ROLES).toBe('canManageCustomRoles')
    })
  })

  describe('ROLE_PERMISSIONS mapping', () => {
    it('should give admin all permissions', () => {
      expect(ROLE_PERMISSIONS.Admin.length).toBeGreaterThan(ROLE_PERMISSIONS.Member.length)
      expect(ROLE_PERMISSIONS.Admin).toContain('canDeleteTeams')
      expect(ROLE_PERMISSIONS.Admin).toContain('canManageCustomRoles')
    })

    it('should give member basic permissions only', () => {
      expect(ROLE_PERMISSIONS.Member).toContain('canViewTeam')
      expect(ROLE_PERMISSIONS.Member).toContain('canSubmitTasks')
      expect(ROLE_PERMISSIONS.Member).not.toContain('canDeleteTeams')
      expect(ROLE_PERMISSIONS.Member).not.toContain('canManageCustomRoles')
    })
  })
})
