/**
 * Teams Controller Tests
 * Tests for team creation, management, sub-teams, and user membership
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockResponse, createMockTeam, createMockUserOfTeam } from './helpers.js'

// Mock models
vi.mock('../models/Teams.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    exists: vi.fn(),
    schema: {
      path: vi.fn().mockReturnValue({
        enumValues: ['Development', 'Marketing', 'Design', 'Research', 'Other'],
      }),
    },
  },
}))

vi.mock('../models/UsersOfTeam.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    deleteMany: vi.fn(),
    exists: vi.fn(),
  },
}))

vi.mock('../models/Tasks.js', () => ({
  default: {
    find: vi.fn(),
  },
}))

vi.mock('../middleware/roleMiddleware.js', () => ({
  ROLES: {
    ADMIN: 'admin',
    MEMBER: 'member',
    CUSTOM: 'custom',
  },
  getBaseRoleFromRoleType: vi.fn((roleType) => {
    if (roleType === 'admin') return 'Admin'
    return 'Member'
  }),
  getRoleLabel: vi.fn((roleType, customRole) => {
    if (customRole?.name) return customRole.name
    if (roleType === 'admin') return 'Admin'
    return 'Member'
  }),
}))

import TeamsController from '../controllers/teamsController.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Tasks from '../models/Tasks.js'
import { ROLES } from '../middleware/roleMiddleware.js'

describe('TeamsController', () => {
  let req, res

  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('should return team categories', async () => {
      await TeamsController.getCategories(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data).toContain('Development')
      expect(res.data).toContain('Marketing')
    })
  })

  describe('addTeamPro', () => {
    it('should return 400 if required fields are missing', async () => {
      req.body = { title: 'Test Team' }

      await TeamsController.addTeamPro(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('required')
    })

    it('should return 400 if userId is missing', async () => {
      req.body = {
        title: 'Test Team',
        category: 'Development',
        description: 'Test description',
        username: 'testuser',
      }

      await TeamsController.addTeamPro(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if team not found after creation', async () => {
      req.body = {
        title: 'Test Team',
        category: 'Development',
        description: 'Test description',
        userId: 'user-123',
        username: 'testuser',
        parentTeamId: null,
      }

      Teams.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      })

      await TeamsController.addTeamPro(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('getTeamNameThatUserIsAdmin', () => {
    it('should return empty array if user is not admin of any team', async () => {
      req.user = { userId: 'user-123' }

      UsersOfTeam.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      })

      await TeamsController.getTeamNameThatUserIsAdmin(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data).toEqual([])
    })

    it('should return teams where user is admin', async () => {
      req.user = { userId: 'user-123' }

      const mockTeams = [
        {
          teamId: {
            _id: 'team-1',
            title: 'Team 1',
            parentTeamId: null,
          },
        },
        {
          teamId: {
            _id: 'team-2',
            title: 'Team 2',
            parentTeamId: null,
          },
        },
      ]

      UsersOfTeam.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockTeams),
        }),
      })

      Teams.findOne.mockResolvedValue(null)

      await TeamsController.getTeamNameThatUserIsAdmin(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(Array.isArray(res.data)).toBe(true)
    })

    it('should filter out orphaned records', async () => {
      req.user = { userId: 'user-123' }

      const mockTeams = [
        { teamId: null }, // orphaned record
        {
          teamId: {
            _id: 'team-1',
            title: 'Valid Team',
            parentTeamId: null,
          },
        },
      ]

      UsersOfTeam.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockTeams),
        }),
      })

      Teams.findOne.mockResolvedValue(null)

      await TeamsController.getTeamNameThatUserIsAdmin(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('getTeamThatUserIsMember', () => {
    it('should return 400 if userId is missing', async () => {
      req.user = {}

      await TeamsController.getTeamThatUserIsMember(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('User ID is required')
    })

    it('should return empty array if user has no teams', async () => {
      req.user = { userId: 'user-123' }

      UsersOfTeam.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      await TeamsController.getTeamThatUserIsMember(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data).toEqual([])
    })

    it('should return teams with progress info', async () => {
      req.user = { userId: 'user-123' }

      const mockTeamMembership = [
        {
          teamId: {
            _id: 'team-1',
            title: 'Team 1',
            category: 'Development',
            description: 'Test team',
            parentTeamId: null,
          },
          roleType: 'member',
          roleId: null,
        },
      ]

      UsersOfTeam.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockTeamMembership),
          }),
        }),
      })

      Teams.findOne.mockResolvedValue(null)
      Tasks.find.mockResolvedValue([])

      await TeamsController.getTeamThatUserIsMember(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('getTeamDetails', () => {
    it('should return 400 if teamId is missing', async () => {
      req.params = {}

      await TeamsController.getTeamDetails(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('Team ID is required')
    })

    it('should return 404 if team not found', async () => {
      req.params = { teamId: 'non-existent' }

      Teams.findById.mockResolvedValue(null)

      await TeamsController.getTeamDetails(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.message).toBe('Team not found')
    })

    it('should return team details', async () => {
      req.params = { teamId: 'team-123' }

      const mockTeam = createMockTeam()
      Teams.findById.mockResolvedValue(mockTeam)

      await TeamsController.getTeamDetails(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.team).toBeDefined()
    })
  })

  describe('deleteATeam', () => {
    it('should return 400 if teamId is missing', async () => {
      req.params = {}

      await TeamsController.deleteATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.error).toBe('Team ID is required')
    })

    it('should return 404 if team not found', async () => {
      req.params = { teamId: 'non-existent' }

      Teams.find.mockResolvedValue([])
      Teams.deleteOne.mockResolvedValue({ deletedCount: 0 })

      await TeamsController.deleteATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete team and associated data', async () => {
      req.params = { teamId: 'team-123' }

      Teams.find.mockResolvedValue([])
      Teams.deleteOne.mockResolvedValue({ deletedCount: 1 })
      UsersOfTeam.deleteMany.mockResolvedValue({ deletedCount: 3 })

      await TeamsController.deleteATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.message).toContain('deleted successfully')
    })

    it('should recursively delete sub-teams', async () => {
      req.params = { teamId: 'team-123' }

      // First call returns sub-teams, subsequent calls return empty
      Teams.find
        .mockResolvedValueOnce([{ _id: 'sub-team-1' }, { _id: 'sub-team-2' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      Teams.deleteOne.mockResolvedValue({ deletedCount: 1 })
      Teams.deleteMany.mockResolvedValue({ deletedCount: 2 })
      UsersOfTeam.deleteMany.mockResolvedValue({ deletedCount: 5 })

      await TeamsController.deleteATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('getAllSubTeams', () => {
    it('should return all sub-teams recursively', async () => {
      req.params = { teamId: 'team-123' }

      // Mock nested sub-teams
      Teams.find
        .mockResolvedValueOnce([
          { _id: 'sub-1', title: 'Sub Team 1' },
          { _id: 'sub-2', title: 'Sub Team 2' },
        ])
        .mockResolvedValueOnce([{ _id: 'sub-1-1', title: 'Sub Sub Team' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      await TeamsController.getAllSubTeams(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.subTeams).toBeDefined()
    })

    it('should return empty array if no sub-teams', async () => {
      req.params = { teamId: 'team-123' }

      Teams.find.mockResolvedValue([])

      await TeamsController.getAllSubTeams(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.subTeams).toEqual([])
    })
  })

  describe('getProgressBar', () => {
    it('should return 0 progress for user with no tasks', async () => {
      Tasks.find.mockResolvedValue([])

      const result = await TeamsController.getProgressBar('user-123', 'team-123')

      expect(result.progressPercentage).toBe(0)
      expect(result.totalWeight).toBe(0)
      expect(result.completedWeight).toBe(0)
    })

    it('should calculate progress correctly', async () => {
      Tasks.find.mockResolvedValue([
        { weighted: 5, submitted: true },
        { weighted: 5, submitted: true },
        { weighted: 10, submitted: false },
      ])

      const result = await TeamsController.getProgressBar('user-123', 'team-123')

      expect(result.totalWeight).toBe(20)
      expect(result.completedWeight).toBe(10)
      expect(result.progressPercentage).toBe(50)
    })

    it('should handle all tasks completed', async () => {
      Tasks.find.mockResolvedValue([
        { weighted: 5, submitted: true },
        { weighted: 10, submitted: true },
      ])

      const result = await TeamsController.getProgressBar('user-123', 'team-123')

      expect(result.progressPercentage).toBe(100)
    })
  })

  describe('getParentsTeam', () => {
    it('should return empty string for root team', async () => {
      const result = await TeamsController.getParentsTeam(null)
      expect(result).toBe('')
    })

    it('should return empty string for "none" parentTeamId', async () => {
      const result = await TeamsController.getParentsTeam('none')
      expect(result).toBe('')
    })

    it('should build breadcrumb for nested teams', async () => {
      Teams.findOne
        .mockResolvedValueOnce({
          title: 'Parent Team',
          parentTeamId: 'grandparent-id',
        })
        .mockResolvedValueOnce({
          title: 'Grandparent Team',
          parentTeamId: 'none',
        })

      const result = await TeamsController.getParentsTeam('parent-id')

      expect(result).toContain('>')
    })
  })

  describe('addUserToTeam', () => {
    it('should not add duplicate user', async () => {
      UsersOfTeam.findOne.mockResolvedValue(createMockUserOfTeam())

      await TeamsController.addUserToTeam('user-123', 'team-123', 'member')

      // Should not throw and should not create new entry
      expect(UsersOfTeam.findOne).toHaveBeenCalled()
    })
  })
})
