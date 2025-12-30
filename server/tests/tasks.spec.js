/**
 * Tasks Controller Tests
 * Tests for task creation, submission, status updates, time tracking, and dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockResponse, createMockTask, createMockUser } from './helpers.js'

// Mock models
vi.mock('../models/Tasks.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    insertMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
    exists: vi.fn(),
  },
  TaskSubmissions: {
    find: vi.fn(),
    findOne: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../models/Teams.js', () => ({
  default: {
    exists: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('../models/UsersOfTeam.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    exists: vi.fn(),
  },
}))

vi.mock('../models/Account.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('../models/TaskActivity.js', () => {
  const mockSave = vi.fn().mockResolvedValue({})
  return {
    default: vi.fn().mockImplementation(() => ({
      save: mockSave,
    })),
  }
})

import TasksController from '../controllers/tasksController.js'
import Tasks, { TaskSubmissions } from '../models/Tasks.js'
import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Account from '../models/Account.js'
import TaskActivity from '../models/TaskActivity.js'

describe('TasksController', () => {
  let req, res

  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    vi.clearAllMocks()
  })

  describe('getTasksOfAUser', () => {
    it('should return 400 if userId is missing', async () => {
      req.user = {}

      await TasksController.getTasksOfAUser(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('User ID is required')
    })

    it('should return tasks for user sorted by due date', async () => {
      req.user = { userId: 'user-123' }
      const mockTasks = [createMockTask(), createMockTask({ _id: { toString: () => 'task-456' } })]

      Tasks.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTasks),
      })

      await TasksController.getTasksOfAUser(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.tasks).toHaveLength(2)
    })

    it('should return empty array if no tasks found', async () => {
      req.user = { userId: 'user-123' }

      Tasks.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      })

      await TasksController.getTasksOfAUser(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.tasks).toHaveLength(0)
    })
  })

  describe('getTasksOfAUserInATeam', () => {
    it('should return 400 if params are missing', async () => {
      req.params = { userId: 'user-123' }

      await TasksController.getTasksOfAUserInATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if user not in team', async () => {
      req.params = { userId: 'user-123', teamId: 'team-123' }

      UsersOfTeam.exists.mockResolvedValue(false)

      await TasksController.getTasksOfAUserInATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.message).toContain('User not found in the specified team')
    })

    it('should return 404 if team not found', async () => {
      req.params = { userId: 'user-123', teamId: 'team-123' }

      UsersOfTeam.exists.mockResolvedValue(true)
      Teams.exists.mockResolvedValue(false)

      await TasksController.getTasksOfAUserInATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.message).toBe('Team not found')
    })

    it('should return tasks for user in team', async () => {
      req.params = { userId: 'user-123', teamId: 'team-123' }
      const mockTasks = [createMockTask()]

      UsersOfTeam.exists.mockResolvedValue(true)
      Teams.exists.mockResolvedValue(true)
      Tasks.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTasks),
      })

      await TasksController.getTasksOfAUserInATeam(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.tasks).toHaveLength(1)
    })
  })

  describe('addTaskToUsers', () => {
    const validTaskData = {
      assignedUsers: ['user-1', 'user-2'],
      teamId: 'team-123',
      title: 'New Task',
      description: 'Task description',
      category: 'Development',
      tags: ['test'],
      priority: 'High',
      weighted: 5,
      startDate: '2025-06-01',
      dueDate: '2025-12-01',
      design: {
        numberOfFields: 1,
        fields: [{ label: 'Field', type: 'text', config: { required: true } }],
      },
    }

    it('should return 400 if required fields are missing', async () => {
      req.body = { assignedUsers: ['user-1'] }

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('Missing required fields')
    })

    it('should return 400 for invalid date format', async () => {
      req.body = { ...validTaskData, startDate: 'invalid-date' }

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('Invalid startDate or dueDate')
    })

    it('should return 400 for dates out of range', async () => {
      req.body = { ...validTaskData, startDate: '2020-01-01' }

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('2025')
    })

    it('should return 400 for invalid design format', async () => {
      req.body = { ...validTaskData, design: { invalid: true } }

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('Invalid design format')
    })

    it('should return 404 if team does not exist', async () => {
      req.body = validTaskData

      Teams.exists.mockResolvedValue(false)

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.message).toBe('Team not found')
    })

    it('should return 404 if assigned users not in team', async () => {
      req.body = validTaskData

      Teams.exists.mockResolvedValue(true)
      UsersOfTeam.find.mockResolvedValue([{ userId: { toString: () => 'user-1' } }])

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.message).toContain('not part of the team')
    })

    it('should create tasks successfully', async () => {
      req.body = validTaskData

      Teams.exists.mockResolvedValue(true)
      UsersOfTeam.find.mockResolvedValue([
        { userId: { toString: () => 'user-1' } },
        { userId: { toString: () => 'user-2' } },
      ])
      Tasks.insertMany.mockResolvedValue([createMockTask(), createMockTask()])

      await TasksController.addTaskToUsers(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.data.tasksCreated).toBe(2)
      expect(res.data.taskGroupId).toBeDefined()
    })
  })

  describe('submitATask', () => {
    it('should return 400 if required fields are missing', async () => {
      req.body = { taskId: 'task-123' }

      await TasksController.submitATask(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if task not found', async () => {
      req.body = {
        taskId: 'task-123',
        userId: 'user-123',
        teamId: 'team-123',
        submissionData: [{ fieldId: 'f1', label: 'Field', type: 'text', value: 'Answer' }],
      }

      Tasks.findById.mockResolvedValue(null)

      await TasksController.submitATask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.data.message).toBe('Task not found')
    })

    it('should return 403 if user not assigned to task', async () => {
      req.body = {
        taskId: 'task-123',
        userId: 'wrong-user',
        teamId: 'team-123',
        submissionData: [{ fieldId: 'f1', label: 'Field', type: 'text', value: 'Answer' }],
      }

      Tasks.findById.mockResolvedValue(createMockTask())

      await TasksController.submitATask(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.data.message).toBe('User is not assigned to this task')
    })

    it('should return 403 if task belongs to different team', async () => {
      req.body = {
        taskId: 'task-123',
        userId: 'user-123',
        teamId: 'wrong-team',
        submissionData: [{ fieldId: 'f1', label: 'Field', type: 'text', value: 'Answer' }],
      }

      Tasks.findById.mockResolvedValue(createMockTask())

      await TasksController.submitATask(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.data.message).toBe('Task does not belong to this team')
    })

    it('should return 400 if required fields missing in submission', async () => {
      req.body = {
        taskId: 'task-123',
        userId: 'user-123',
        teamId: 'team-123',
        submissionData: [{ fieldId: 'f1', label: 'Wrong Field', type: 'text', value: 'Answer' }],
      }

      Tasks.findById.mockResolvedValue(createMockTask())

      await TasksController.submitATask(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toContain('Missing required fields')
    })
  })

  describe('updateTaskStatus', () => {
    it('should return 400 if status is missing', async () => {
      req.params = { taskId: 'task-123' }
      req.body = {}
      req.user = { userId: 'user-123', username: 'testuser' }

      await TasksController.updateTaskStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('Status is required')
    })

    it('should return 404 if task not found', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { status: 'in_progress' }
      req.user = { userId: 'user-123', username: 'testuser' }

      Tasks.findById.mockResolvedValue(null)

      await TasksController.updateTaskStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update task status successfully', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { status: 'in_progress' }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask()
      Tasks.findById.mockResolvedValue(mockTask)

      await TasksController.updateTaskStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.message).toBe('Task status updated successfully')
    })
  })

  describe('logTime', () => {
    it('should return 400 if hours is invalid', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { hours: 0 }
      req.user = { userId: 'user-123', username: 'testuser' }

      await TasksController.logTime(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('Hours must be a positive number')
    })

    it('should log time successfully', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { hours: 2.5 }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask({ loggedHours: 5 })
      Tasks.findById.mockResolvedValue(mockTask)

      await TasksController.logTime(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockTask.loggedHours).toBe(7.5)
    })
  })

  describe('updateTaskEstimate', () => {
    it('should return 400 if estimatedHours is negative', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { estimatedHours: -1 }
      req.user = { userId: 'user-123', username: 'testuser' }

      await TasksController.updateTaskEstimate(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should update estimate successfully', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { estimatedHours: 10 }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask()
      Tasks.findById.mockResolvedValue(mockTask)

      await TasksController.updateTaskEstimate(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockTask.estimatedHours).toBe(10)
    })
  })

  describe('addTaskDependency', () => {
    it('should return 400 if required fields missing', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { dependencyType: 'blockedBy' }
      req.user = { userId: 'user-123', username: 'testuser' }

      await TasksController.addTaskDependency(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 for invalid dependency type', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { dependencyType: 'invalid', dependentTaskId: 'task-456' }
      req.user = { userId: 'user-123', username: 'testuser' }

      await TasksController.addTaskDependency(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('Invalid dependency type')
    })

    it('should prevent self-dependency', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { dependencyType: 'blockedBy', dependentTaskId: 'task-123' }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask()
      Tasks.findById.mockResolvedValue(mockTask)

      await TasksController.addTaskDependency(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.data.message).toBe('Task cannot depend on itself')
    })

    it('should add blockedBy dependency', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { dependencyType: 'blockedBy', dependentTaskId: 'task-456' }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask()
      const mockDependentTask = createMockTask({ _id: { toString: () => 'task-456' } })

      Tasks.findById.mockImplementation((id) => {
        if (id === 'task-123') return Promise.resolve(mockTask)
        return Promise.resolve(mockDependentTask)
      })

      await TasksController.addTaskDependency(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('removeTaskDependency', () => {
    it('should remove dependency successfully', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { dependencyType: 'blockedBy', dependentTaskId: 'task-456' }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask({
        dependencies: { blockedBy: ['task-456'], blocking: [] },
      })
      const mockDependentTask = createMockTask({
        _id: { toString: () => 'task-456' },
        dependencies: { blockedBy: [], blocking: ['task-123'] },
      })

      Tasks.findById.mockImplementation((id) => {
        if (id === 'task-123') return Promise.resolve(mockTask)
        return Promise.resolve(mockDependentTask)
      })

      await TasksController.removeTaskDependency(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('assignTaskToSprint', () => {
    it('should assign task to sprint', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { sprintId: 'sprint-123' }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask()
      Tasks.findById.mockResolvedValue(mockTask)

      await TasksController.assignTaskToSprint(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockTask.sprintId).toBe('sprint-123')
    })

    it('should remove task from sprint', async () => {
      req.params = { taskId: 'task-123' }
      req.body = { sprintId: null }
      req.user = { userId: 'user-123', username: 'testuser' }

      const mockTask = createMockTask({ sprintId: 'sprint-123' })
      Tasks.findById.mockResolvedValue(mockTask)

      await TasksController.assignTaskToSprint(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockTask.sprintId).toBeNull()
    })
  })

  describe('getTasksByGroupId', () => {
    it('should return 400 if params missing', async () => {
      req.params = { taskGroupId: 'group-123' }

      await TasksController.getTasksByGroupId(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if no tasks found', async () => {
      req.params = { taskGroupId: 'group-123', teamId: 'team-123' }

      Tasks.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      })

      await TasksController.getTasksByGroupId(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return tasks grouped by user', async () => {
      req.params = { taskGroupId: 'group-123', teamId: 'team-123' }

      const mockTasks = [
        createMockTask({ userId: 'user-1' }),
        createMockTask({ userId: 'user-2' }),
      ]

      Tasks.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockTasks),
      })

      Account.find.mockResolvedValue([
        { _id: { toString: () => 'user-1' }, username: 'user1' },
        { _id: { toString: () => 'user-2' }, username: 'user2' },
      ])

      await TasksController.getTasksByGroupId(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.tasksByUser).toBeDefined()
    })
  })

  describe('deleteTaskGroup', () => {
    it('should return 400 if params missing', async () => {
      req.params = { taskGroupId: 'group-123' }

      await TasksController.deleteTaskGroup(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if no tasks found', async () => {
      req.params = { taskGroupId: 'group-123', teamId: 'team-123' }

      Tasks.find.mockResolvedValue([])
      Tasks.deleteMany.mockResolvedValue({ deletedCount: 0 })

      await TasksController.deleteTaskGroup(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete task group successfully', async () => {
      req.params = { taskGroupId: 'group-123', teamId: 'team-123' }

      Tasks.find.mockResolvedValue([createMockTask(), createMockTask()])
      TaskSubmissions.deleteMany.mockResolvedValue({ deletedCount: 2 })
      Tasks.deleteMany.mockResolvedValue({ deletedCount: 2 })

      await TasksController.deleteTaskGroup(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.deletedCount).toBe(2)
    })
  })

  describe('getAllTaskGroups', () => {
    it('should return 400 if teamId missing', async () => {
      req.params = {}

      await TasksController.getAllTaskGroups(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return aggregated task groups', async () => {
      req.params = { teamId: 'team-123' }

      Tasks.aggregate.mockResolvedValue([
        {
          _id: 'group-1',
          title: 'Task Group 1',
          totalTasks: 5,
          completedTasks: 2,
          totalWeight: 25,
        },
      ])

      await TasksController.getAllTaskGroups(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.data.taskGroups).toBeDefined()
    })
  })
})
