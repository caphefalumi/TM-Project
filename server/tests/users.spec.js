/**
 * Users Controller Tests
 * Tests for user management, team membership, role changes, and profile updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockResponse, createMockUser, createMockUserOfTeam } from './helpers.js'

// Mock models
vi.mock('../models/Account.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

vi.mock('../models/Teams.js', () => ({
  default: {
    exists: vi.fn(),
  },
}))

vi.mock('../models/UsersOfTeam.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    insertMany: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('../models/Tasks.js', () => ({
  default: {
    deleteMany: vi.fn(),
  },
  TaskSubmissions: {
    deleteMany: vi.fn(),
  },
}))

vi.mock('../models/Role.js', () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../models/RefreshToken.js', () => ({
  default: {
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('../services/tokenService.js', () => ({
  generateAccessToken: vi.fn().mockReturnValue('new-access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('new-refresh-token'),
}))

vi.mock('../scripts/mailer.js', () => ({
  default: {
    sendMail: vi.fn().mockResolvedValue(true),
    sendEmailUpdateConfirmation: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('../scripts/notificationsService.js', () => ({
  createTeamMemberAddedNotification: vi.fn().mockResolvedValue({}),
}))

vi.mock('../middleware/roleMiddleware.js', () => ({
  ROLES: {
    ADMIN: 'admin',
    MEMBER: 'member',
    CUSTOM: 'custom',
  },
  getBaseRoleFromRoleType: vi.fn((roleType) => (roleType === 'admin' ? 'Admin' : 'Member')),
  getRoleLabel: vi.fn((roleType, customRole) => customRole?.name || (roleType === 'admin' ? 'Admin' : 'Member')),
  getUserCustomPermissions: vi.fn(),
  getRoleDefaultPermissions: vi.fn(() => ({})),
}))

vi.mock('../config/permissions.js', () => ({
  PERMISSIONS: {
    VIEW_TEAM: 'canViewTeam',
    MANAGE_TASKS: 'canManageTasks',
  },
  computeUserActions: vi.fn(() => ({
    canViewTeam: true,
    canManageTasks: false,
  })),
}))

import {
  getAuthenticatedUser,
  getAllUsers,
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
  updateUserProfile,
  verifyEmailChange,
  deleteUserAccount,
} from '../controllers/usersController.js'
import Account from '../models/Account.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'
import Role from '../models/Role.js'
import { ROLES } from '../middleware/roleMiddleware.js'

describe('UsersController', () => {
  let req, res

  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    vi.clearAllMocks()
  })

  describe('getAuthenticatedUser', () => {
    it('should return 404 if user not found', async () => {
      req.user = { userId: 'non-existent' }

      Account.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      })

      await getAuthenticatedUser(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.error).toBe('User not found')
    })

    it('should return user data', async () => {
      req.user = { userId: 'user-123' }

      const mockUser = createMockUser()
      Account.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      })

      await getAuthenticatedUser(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.user.username).toBe(mockUser.username)
    })
  })

  describe('getAllUsers', () => {
    it('should return 404 if no users found', async () => {
      Account.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      })

      await getAllUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return all users', async () => {
      const mockUsers = [
        { username: 'user1', _id: 'id-1' },
        { username: 'user2', _id: 'id-2' },
      ]

      Account.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockUsers),
      })

      await getAllUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data).toHaveLength(2)
    })
  })

  describe('addUsersToTeam', () => {
    it('should return 400 if users array is empty', async () => {
      req.body = { users: [] }
      req.user = { userId: 'admin-123' }

      await addUsersToTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Users array is required')
    })

    it('should return 400 if teamId is missing', async () => {
      req.body = { users: [{ userId: 'user-1' }] }
      req.user = { userId: 'admin-123' }

      await addUsersToTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Team ID is required')
    })

    it('should return 404 if team does not exist', async () => {
      req.body = { users: [{ userId: 'user-1', teamId: 'team-123', username: 'test' }] }
      req.user = { userId: 'admin-123' }

      Teams.exists.mockResolvedValue(false)

      await addUsersToTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should add users to team successfully', async () => {
      req.body = {
        users: [
          { userId: 'user-1', teamId: 'team-123', username: 'user1' },
          { userId: 'user-2', teamId: 'team-123', username: 'user2' },
        ],
      }
      req.user = { userId: 'admin-123' }

      Teams.exists.mockResolvedValue(true)
      UsersOfTeam.findOne
        .mockResolvedValueOnce({ roleType: 'admin' }) // requester
        .mockResolvedValueOnce(null) // user-1 not in team
        .mockResolvedValueOnce(null) // user-2 not in team
      UsersOfTeam.insertMany.mockResolvedValue([{}, {}])

      await addUsersToTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.addedUsers).toBe(2)
    })

    it('should skip duplicate users', async () => {
      req.body = {
        users: [{ userId: 'user-1', teamId: 'team-123', username: 'user1' }],
      }
      req.user = { userId: 'admin-123' }

      Teams.exists.mockResolvedValue(true)
      UsersOfTeam.findOne
        .mockResolvedValueOnce({ roleType: 'admin' }) // requester
        .mockResolvedValueOnce(createMockUserOfTeam()) // user already in team
      UsersOfTeam.insertMany.mockResolvedValue([])

      await addUsersToTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.addedUsers).toBe(0)
    })
  })

  describe('getUsersOfTeam', () => {
    it('should return 400 if teamId is missing', async () => {
      req.params = {}

      await getUsersOfTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if team does not exist', async () => {
      req.params = { teamId: 'non-existent' }

      Teams.exists.mockResolvedValue(false)

      await getUsersOfTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 if no users in team', async () => {
      req.params = { teamId: 'team-123' }

      Teams.exists.mockResolvedValue(true)
      UsersOfTeam.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([]),
        }),
      })

      await getUsersOfTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return team members', async () => {
      req.params = { teamId: 'team-123' }

      Teams.exists.mockResolvedValue(true)
      UsersOfTeam.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([
            { userId: 'user-1', roleType: 'admin', roleId: null },
            { userId: 'user-2', roleType: 'member', roleId: null },
          ]),
        }),
      })

      Account.find.mockResolvedValue([
        { _id: { toString: () => 'user-1' }, username: 'admin_user' },
        { _id: { toString: () => 'user-2' }, username: 'member_user' },
      ])

      await getUsersOfTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(Array.isArray(res.data)).toBe(true)
    })
  })

  describe('deleteUsersFromTeam', () => {
    it('should return 400 if teamId is missing', async () => {
      req.params = {}
      req.body = [{ userId: 'user-1' }]

      await deleteUsersFromTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 if users array is invalid', async () => {
      req.params = { teamId: 'team-123' }
      req.body = 'invalid'

      await deleteUsersFromTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if user not in team', async () => {
      req.params = { teamId: 'team-123' }
      req.body = [{ userId: 'user-1' }]

      UsersOfTeam.findOne.mockResolvedValue(null)

      await deleteUsersFromTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete users and their data', async () => {
      req.params = { teamId: 'team-123' }
      req.body = [{ userId: 'user-1' }]

      UsersOfTeam.findOne.mockResolvedValue(createMockUserOfTeam())
      Tasks.deleteMany.mockResolvedValue({ deletedCount: 2 })
      TaskSubmissions.deleteMany.mockResolvedValue({ deletedCount: 1 })
      UsersOfTeam.deleteOne.mockResolvedValue({ deletedCount: 1 })

      await deleteUsersFromTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('changeUserRole', () => {
    it('should return 400 if roleType is missing', async () => {
      req.params = { teamId: 'team-123', userId: 'user-123' }
      req.body = {}
      req.user = { userId: 'admin-123' }

      await changeUserRole(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 403 if trying to change own role', async () => {
      req.params = { teamId: 'team-123', userId: 'user-123' }
      req.body = { roleType: 'member' }
      req.user = { userId: 'user-123' }

      await changeUserRole(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return 404 if target user not in team', async () => {
      req.params = { teamId: 'team-123', userId: 'user-456' }
      req.body = { roleType: 'admin' }
      req.user = { userId: 'admin-123' }

      UsersOfTeam.findOne.mockResolvedValue(null)

      await changeUserRole(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should require roleId for custom role', async () => {
      req.params = { teamId: 'team-123', userId: 'user-456' }
      req.body = { roleType: 'custom' }
      req.user = { userId: 'admin-123' }

      UsersOfTeam.findOne.mockResolvedValue(createMockUserOfTeam())

      await changeUserRole(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('Custom role ID is required')
    })

    it('should update role successfully', async () => {
      req.params = { teamId: 'team-123', userId: 'user-456' }
      req.body = { roleType: 'admin' }
      req.user = { userId: 'admin-123' }

      UsersOfTeam.findOne.mockResolvedValue(createMockUserOfTeam())
      UsersOfTeam.findOneAndUpdate.mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          userId: 'user-456',
          roleType: 'admin',
          roleId: null,
        }),
      })

      await changeUserRole(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('getUserPermissions', () => {
    it('should return all permissions for global admin', async () => {
      req.params = { teamId: 'team-123', userId: 'user-123' }
      req.user = { userId: 'admin-id', username: 'admin' }

      await getUserPermissions(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.isGlobalAdmin).toBe(true)
    })

    it('should return 404 if user not in team', async () => {
      req.params = { teamId: 'team-123', userId: 'user-123' }
      req.user = { userId: 'requester-123', username: 'requester' }

      const { getUserCustomPermissions } = await import('../middleware/roleMiddleware.js')
      getUserCustomPermissions.mockResolvedValue(null)

      await getUserPermissions(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('updateUserPermissions', () => {
    it('should return 404 if user not in team', async () => {
      req.params = { teamId: 'team-123', userId: 'user-123' }
      req.body = { customPermissions: { canManageTasks: true } }

      UsersOfTeam.findOne.mockResolvedValue(null)

      await updateUserPermissions(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update permissions successfully', async () => {
      req.params = { teamId: 'team-123', userId: 'user-123' }
      req.body = { customPermissions: { canManageTasks: true } }

      UsersOfTeam.findOne.mockResolvedValue(createMockUserOfTeam())
      UsersOfTeam.findOneAndUpdate.mockResolvedValue({})

      await updateUserPermissions(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('updateUserProfile', () => {
    it('should return 400 if no fields provided', async () => {
      req.user = { userId: 'user-123' }
      req.body = {}

      await updateUserProfile(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 if field is empty', async () => {
      req.user = { userId: 'user-123' }
      req.body = { username: '' }

      await updateUserProfile(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if user not found', async () => {
      req.user = { userId: 'user-123' }
      req.body = { username: 'newname' }

      Account.findById.mockResolvedValue(null)

      await updateUserProfile(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 400 if username already exists', async () => {
      req.user = { userId: 'user-123' }
      req.body = { username: 'existinguser' }

      Account.findById.mockResolvedValue(createMockUser())
      Account.findOne.mockResolvedValue(createMockUser({ username: 'existinguser' }))

      await updateUserProfile(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Username already exists')
    })
  })

  describe('deleteUserAccount', () => {
    it('should return 404 if user not found', async () => {
      req.user = { userId: 'user-123' }

      Account.findById.mockResolvedValue(null)

      await deleteUserAccount(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete user and all associated data', async () => {
      req.user = { userId: 'user-123' }

      Account.findById.mockResolvedValue(createMockUser())
      UsersOfTeam.deleteMany.mockResolvedValue({})
      TaskSubmissions.deleteMany.mockResolvedValue({})
      Role.deleteMany.mockResolvedValue({})
      Account.findByIdAndDelete.mockResolvedValue({})

      await deleteUserAccount(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.success).toBe('Account deleted successfully')
    })
  })
})
