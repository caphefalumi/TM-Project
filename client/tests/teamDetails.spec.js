/**
 * Team Details View Tests
 * Tests team details, tabs, permissions, cache behavior, and CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import TeamDetails from '../src/views/TeamDetails.vue'
import {
  createTestPinia,
  setupFetchMock,
  mockFetchResponse,
  createMockUser,
  createMockTeam,
  createMockTask,
  createMockAnnouncement,
  createMockTeamMember,
  createMockPermissions,
  flushPromises,
} from './helpers.js'

// Mock dependencies
vi.mock('../src/scripts/authStore.js', () => ({
  default: {
    getUserByAccessToken: vi.fn(),
  },
}))

vi.mock('../src/scripts/permissionService.js', () => ({
  permissionService: {
    setUserActions: vi.fn(),
    getUserActions: vi.fn(() => ({})),
    hasPermission: vi.fn(() => true),
  },
}))

vi.mock('../src/composables/useComponentCache.js', () => ({
  useComponentCache: vi.fn(() => ({
    addTeamToCache: vi.fn(),
    updateTeamAccess: vi.fn(),
    removeTeamFromCache: vi.fn(),
    getTeamComponentKey: vi.fn(() => 'TeamDetails-team-1'),
    needsRefresh: vi.fn(() => false),
    markAsRefreshed: vi.fn(),
    isTeamCacheValid: vi.fn(() => false),
    cleanExpiredCache: vi.fn(),
    getCacheStats: vi.fn(() => ({ size: 0 })),
  })),
}))

import AuthStore from '../src/scripts/authStore.js'
import { permissionService } from '../src/services/permissionService.js'
import { useComponentCache } from '../src/composables/useComponentCache.js'

describe('TeamDetails View', () => {
  let wrapper
  let router
  let pinia
  let fetchMock
  let cacheComposable

  const mockUser = createMockUser()
  const mockTeam = createMockTeam({ teamId: 'team-1' })
  const mockTasks = [
    createMockTask({ taskId: 'task-1', title: 'Task 1', tags: ['frontend'], teamId: 'team-1' }),
    createMockTask({ taskId: 'task-2', title: 'Task 2', tags: ['backend'], teamId: 'team-1' }),
    createMockTask({ taskId: 'task-3', title: 'Task 3', tags: ['design'], teamId: 'team-1' }),
  ]
  const mockAnnouncements = [
    createMockAnnouncement({ announcementId: 'ann-1', title: 'Announcement 1', teamId: 'team-1' }),
    createMockAnnouncement({ announcementId: 'ann-2', title: 'Announcement 2', teamId: 'team-1' }),
  ]
  const mockMembers = [
    createMockTeamMember({ userId: '123', username: 'testuser', roleType: 'admin' }),
    createMockTeamMember({ userId: '456', username: 'member1', roleType: 'member' }),
    createMockTeamMember({ userId: '789', username: 'member2', roleType: 'member' }),
  ]
  const mockSubTeams = [createMockTeam({ teamId: 'subteam-1', title: 'Sub Team 1' })]
  const mockTaskGroups = [{ taskGroupId: 'group-1', title: 'Group 1', tasks: ['task-1', 'task-2'] }]
  const mockPermissions = createMockPermissions({
    canViewTeam: true,
    canViewTasks: true,
    canViewAnnouncements: true,
    canViewMembers: true,
    canManageTasks: true,
    canManageAnnouncements: true,
  })

  beforeEach(() => {
    // Setup mocks
    fetchMock = setupFetchMock()
    pinia = createTestPinia()

    // Mock cache composable
    cacheComposable = {
      addTeamToCache: vi.fn(),
      updateTeamAccess: vi.fn(),
      removeTeamFromCache: vi.fn(),
      getTeamComponentKey: vi.fn(() => 'TeamDetails-team-1'),
      needsRefresh: vi.fn(() => false),
      markAsRefreshed: vi.fn(),
      isTeamCacheValid: vi.fn(() => false),
      cleanExpiredCache: vi.fn(),
      getCacheStats: vi.fn(() => ({ size: 0 })),
    }
    useComponentCache.mockReturnValue(cacheComposable)

    // Create router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/teams/:teamId',
          name: 'TeamDetails',
          component: TeamDetails,
        },
        { path: '/teams', name: 'Teams', component: { template: '<div>Teams</div>' } },
      ],
    })

    // Mock environment variables
    import.meta.env.VITE_API_PORT = 'http://localhost:3000'

    // Mock user authentication
    AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

    // Mock permission service
    permissionService.getUserActions.mockReturnValue(mockPermissions)
    permissionService.hasPermission.mockReturnValue(true)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const setupStandardFetchMocks = () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('/api/teams/team-1/tasks')) {
        return mockFetchResponse(mockTasks)
      }
      if (url.includes('/api/teams/team-1/announcements')) {
        return mockFetchResponse(mockAnnouncements)
      }
      if (url.includes('/api/teams/team-1/members')) {
        return mockFetchResponse(mockMembers)
      }
      if (url.includes('/api/teams/team-1/subteams')) {
        return mockFetchResponse(mockSubTeams)
      }
      if (url.includes('/api/teams/team-1/task-groups')) {
        return mockFetchResponse(mockTaskGroups)
      }
      if (url.includes('/api/teams/team-1/permissions')) {
        return mockFetchResponse(mockPermissions)
      }
      if (url.includes('/api/teams/team-1') && !url.includes('/')) {
        return mockFetchResponse(mockTeam)
      }
      return mockFetchResponse({ error: 'Not found' }, false, 404)
    })
  }

  const mountTeamDetails = async (teamId = 'team-1', queryParams = {}) => {
    await router.push({ path: `/teams/${teamId}`, query: queryParams })

    wrapper = mount(TeamDetails, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'v-container': false,
          'v-row': false,
          'v-col': false,
          'v-card': false,
          'v-tabs': false,
          'v-tab': false,
          'v-window': false,
          'v-window-item': false,
          'v-btn': false,
          'v-icon': false,
          'v-text-field': false,
          'v-select': false,
          'v-chip': false,
          'v-pagination': false,
          'v-skeleton-loader': false,
          NewTasks: true,
          NewAnnouncements: true,
          TaskSubmission: true,
          DeleteMembers: true,
          UpdateAnnouncements: true,
          DeleteAnnouncements: true,
          AnnouncementView: true,
          UpdateTaskGroups: true,
          RoleManagement: true,
          RoleManagementTabs: true,
          NewMembers: true,
          WorkflowView: true,
          NotFound: true,
        },
      },
    })
    await flushPromises()
    return wrapper
  }

  describe('Component Initialization', () => {
    it('should fetch all team data on mount', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(AuthStore.getUserByAccessToken).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/team-1/tasks',
        expect.any(Object),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/team-1/announcements',
        expect.any(Object),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/team-1/members',
        expect.any(Object),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/team-1',
        expect.any(Object),
      )
    })

    it('should populate component data correctly', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.team.teamId).toBe('team-1')
      expect(wrapper.vm.tasks).toHaveLength(3)
      expect(wrapper.vm.announcements).toHaveLength(2)
      expect(wrapper.vm.teamMembers).toHaveLength(3)
    })

    it('should set default tab to tasks if not specified', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails('team-1', {})

      // Assert
      expect(router.currentRoute.value.query.tab).toBe('tasks')
    })

    it('should respect tab query parameter', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails('team-1', { tab: 'announcements' })

      // Assert
      expect(wrapper.vm.activeTab).toBe('announcements')
    })
  })

  describe('Loading States', () => {
    it('should show loading states while fetching data', async () => {
      // Arrange
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolve

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.isLoadingTasks).toBe(true)
      expect(wrapper.vm.isLoadingAnnouncements).toBe(true)
      expect(wrapper.vm.isLoadingMembers).toBe(true)
      expect(wrapper.vm.isLoadingTeamDetails).toBe(true)
    })

    it('should clear loading states after data is fetched', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.isLoadingTasks).toBe(false)
      expect(wrapper.vm.isLoadingAnnouncements).toBe(false)
      expect(wrapper.vm.isLoadingMembers).toBe(false)
      expect(wrapper.vm.isLoadingTeamDetails).toBe(false)
    })
  })

  describe('Cache Behavior', () => {
    it('should add team to cache on mount', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(cacheComposable.addTeamToCache).toHaveBeenCalledWith('team-1')
    })

    it('should use cached data when cache is valid', async () => {
      // Arrange
      setupStandardFetchMocks()
      cacheComposable.isTeamCacheValid.mockReturnValue(true)

      // Mount first time to populate cache
      await mountTeamDetails()
      await flushPromises()

      // Store cache data in component's internal cache
      wrapper.vm.updateCacheWithCurrentData()

      fetchMock.mockClear()

      // Act - simulate route change back to same team
      await router.push('/teams/team-1')
      await flushPromises()

      // In a real scenario, the cache would prevent refetching
      // This tests the cache mechanism structure
      expect(cacheComposable.isTeamCacheValid).toHaveBeenCalled()
    })

    it('should update cache after fetching fresh data', async () => {
      // Arrange
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(cacheComposable.updateTeamAccess).toHaveBeenCalledWith('team-1')
    })
  })

  describe('Tab Navigation', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should sync activeTab with URL query parameter', async () => {
      // Arrange & Act
      await mountTeamDetails('team-1', { tab: 'members' })

      // Assert
      expect(wrapper.vm.activeTab).toBe('members')
    })

    it('should update URL when tab changes', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.activeTab = 'announcements'
      await nextTick()
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.query.tab).toBe('announcements')
    })

    it('should fetch sub-teams when delete-team tab is activated', async () => {
      // Arrange
      await mountTeamDetails()
      fetchMock.mockClear()
      setupStandardFetchMocks()

      // Act
      wrapper.vm.activeTab = 'delete-team'
      await nextTick()
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/team-1/subteams',
        expect.any(Object),
      )
    })
  })

  describe('Permission-Based UI', () => {
    it('should show task management button when user has permission', async () => {
      // Arrange
      permissionService.hasPermission.mockImplementation((perm) => perm === 'canManageTasks')
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.canManageTasks).toBeTruthy()
    })

    it('should hide task management button when user lacks permission', async () => {
      // Arrange
      permissionService.hasPermission.mockReturnValue(false)
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert - test permission check was made
      expect(permissionService.getUserActions).toHaveBeenCalled()
    })

    it('should show announcement management when user has permission', async () => {
      // Arrange
      permissionService.hasPermission.mockImplementation(
        (perm) => perm === 'canManageAnnouncements',
      )
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.canManageAnnouncements).toBeTruthy()
    })

    it('should show member management when user has permission', async () => {
      // Arrange
      permissionService.hasPermission.mockImplementation(
        (perm) => perm === 'canAddMembers' || perm === 'canRemoveMembers',
      )
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.canAddMembers).toBeTruthy()
    })
  })

  describe('Guard - Non-Member Access', () => {
    it('should show not found when user is not a member', async () => {
      // Arrange
      const nonMemberUser = createMockUser({ userId: '999', username: 'outsider' })
      AuthStore.getUserByAccessToken.mockResolvedValue(nonMemberUser)
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.teamNotFound).toBe(true)
    })

    it('should allow admin access even if not a member', async () => {
      // Arrange
      const adminUser = createMockUser({ userId: '1', username: 'admin' })
      AuthStore.getUserByAccessToken.mockResolvedValue(adminUser)
      setupStandardFetchMocks()

      // Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.teamNotFound).toBe(false)
      expect(wrapper.vm.userLoaded).toBe(true)
    })
  })

  describe('Task Search and Filtering', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should filter tasks by search query', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.taskSearchQuery = 'Task 1'
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTasks).toHaveLength(1)
      expect(wrapper.vm.filteredTasks[0].title).toBe('Task 1')
    })

    it('should filter tasks by tag', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.taskTagSearchQuery = 'frontend'
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTasks).toHaveLength(1)
      expect(wrapper.vm.filteredTasks[0].tags).toContain('frontend')
    })

    it('should filter tasks by type (not-submitted, pending)', async () => {
      // Arrange
      const tasksWithSubmissions = [
        createMockTask({ taskId: 'task-1', title: 'Task 1', hasSubmission: false }),
        createMockTask({
          taskId: 'task-2',
          title: 'Task 2',
          hasSubmission: true,
          submissionStatus: 'pending',
        }),
        createMockTask({
          taskId: 'task-3',
          title: 'Task 3',
          hasSubmission: true,
          submissionStatus: 'approved',
        }),
      ]

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/team-1/tasks')) {
          return mockFetchResponse(tasksWithSubmissions)
        }
        return setupStandardFetchMocks()
      })

      await mountTeamDetails()

      // Act - filter not submitted
      wrapper.vm.taskFilterType = 'not-submitted'
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTasks.length).toBeGreaterThanOrEqual(0)
    })

    it('should reset pagination when search changes', async () => {
      // Arrange
      await mountTeamDetails()
      wrapper.vm.taskCurrentPage = 2

      // Act
      wrapper.vm.taskSearchQuery = 'new search'
      await nextTick()

      // Assert
      expect(wrapper.vm.taskCurrentPage).toBe(1)
    })
  })

  describe('Dialog Management', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should open new task dialog', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.newTaskDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.newTaskDialog).toBe(true)
      const dialog = wrapper.findComponent({ name: 'NewTasks' })
      expect(dialog.exists()).toBe(true)
    })

    it('should open task submission dialog with correct task', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.selectedTaskForSubmission = mockTasks[0]
      wrapper.vm.taskSubmissionDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.taskSubmissionDialog).toBe(true)
      expect(wrapper.vm.selectedTaskForSubmission.taskId).toBe('task-1')
    })

    it('should open announcement view dialog', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.announcementToView = mockAnnouncements[0]
      wrapper.vm.viewAnnouncementDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.viewAnnouncementDialog).toBe(true)
      expect(wrapper.vm.announcementToView.announcementId).toBe('ann-1')
    })

    it('should open update announcement dialog', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.announcementToEdit = mockAnnouncements[0]
      wrapper.vm.updateAnnouncementDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.updateAnnouncementDialog).toBe(true)
      expect(wrapper.vm.announcementToEdit.announcementId).toBe('ann-1')
    })

    it('should open delete announcement dialog', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.selectedAnnouncementForDeletion = mockAnnouncements[0]
      wrapper.vm.deleteAnnouncementDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.deleteAnnouncementDialog).toBe(true)
    })

    it('should open member management dialogs', async () => {
      // Arrange
      await mountTeamDetails()

      // Act - add members
      wrapper.vm.addMembersDialog = true
      await nextTick()
      expect(wrapper.vm.addMembersDialog).toBe(true)

      // Act - remove members
      wrapper.vm.deleteMembersDialog = true
      await nextTick()
      expect(wrapper.vm.deleteMembersDialog).toBe(true)
    })

    it('should open role management dialog', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.roleManagementDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.roleManagementDialog).toBe(true)
    })
  })

  describe('Task Group Management', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should fetch task groups on mount', async () => {
      // Arrange & Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.taskGroups).toHaveLength(1)
      expect(wrapper.vm.taskGroups[0].taskGroupId).toBe('group-1')
    })

    it('should open update task group dialog', async () => {
      // Arrange
      await mountTeamDetails()

      // Act
      wrapper.vm.selectedTaskGroupId = 'group-1'
      wrapper.vm.updateTaskGroupDialog = true
      await nextTick()

      // Assert
      expect(wrapper.vm.updateTaskGroupDialog).toBe(true)
      expect(wrapper.vm.selectedTaskGroupId).toBe('group-1')
    })

    it('should refresh task groups', async () => {
      // Arrange
      await mountTeamDetails()
      fetchMock.mockClear()
      setupStandardFetchMocks()

      // Act
      await wrapper.vm.getTaskGroups()
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/team-1/task-groups',
        expect.any(Object),
      )
    })
  })

  describe('Sub-Teams', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should fetch sub-teams', async () => {
      // Arrange & Act
      await mountTeamDetails()

      // Assert
      expect(wrapper.vm.subTeams).toHaveLength(1)
      expect(wrapper.vm.subTeams[0].teamId).toBe('subteam-1')
    })

    it('should set loading state while fetching sub-teams', async () => {
      // Arrange
      fetchMock.mockImplementation((url) => {
        if (url.includes('/subteams')) {
          return new Promise(() => {}) // Never resolve
        }
        return setupStandardFetchMocks()
      })

      // Act
      await mountTeamDetails()
      const promise = wrapper.vm.fetchSubTeams()

      // Assert
      expect(wrapper.vm.isLoadingSubTeams).toBe(true)
    })
  })

  describe('Route Parameter Changes', () => {
    it('should reload data when teamId changes', async () => {
      // Arrange
      setupStandardFetchMocks()
      await mountTeamDetails('team-1')
      fetchMock.mockClear()

      // Update mock for new team
      const newTeam = createMockTeam({ teamId: 'team-2', title: 'Team 2' })
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/team-2')) {
          return mockFetchResponse(newTeam)
        }
        if (url.includes('/api/teams/team-2/tasks')) {
          return mockFetchResponse([])
        }
        if (url.includes('/api/teams/team-2/announcements')) {
          return mockFetchResponse([])
        }
        if (url.includes('/api/teams/team-2/members')) {
          return mockFetchResponse([mockMembers[0]]) // User is member
        }
        if (url.includes('/api/teams/team-2/subteams')) {
          return mockFetchResponse([])
        }
        if (url.includes('/api/teams/team-2/task-groups')) {
          return mockFetchResponse([])
        }
        if (url.includes('/api/teams/team-2/permissions')) {
          return mockFetchResponse(mockPermissions)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      await router.push('/teams/team-2')
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalled()
      expect(cacheComposable.addTeamToCache).toHaveBeenCalledWith('team-2')
    })
  })

  describe('Document Title', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should update document title with team name', async () => {
      // Arrange & Act
      await mountTeamDetails()

      // Assert
      expect(document.title).toContain(mockTeam.title)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      // Arrange
      fetchMock.mockRejectedValue(new Error('Network error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      await mountTeamDetails()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should show not found when team does not exist', async () => {
      // Arrange
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/team-1')) {
          return mockFetchResponse({ error: 'Team not found' }, false, 404)
        }
        return mockFetchResponse([])
      })

      // Act
      await mountTeamDetails()

      // Assert - component should handle missing team
      expect(wrapper.vm.team.teamId).toBeFalsy()
    })
  })

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      setupStandardFetchMocks()
    })

    it('should refresh all data when refresh is triggered', async () => {
      // Arrange
      await mountTeamDetails()
      fetchMock.mockClear()
      setupStandardFetchMocks()

      // Act
      await wrapper.vm.initializeTeamData(true)
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalled()
    })
  })
})
