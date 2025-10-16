/**
 * Teams View Tests
 * Tests team dashboard, search, filtering, pagination, and team navigation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import TeamsView from '../src/views/TeamsView.vue'
import {
  createTestPinia,
  setupFetchMock,
  mockFetchResponse,
  createMockUser,
  createMockTeam,
  flushPromises,
} from './helpers.js'

// Mock dependencies
vi.mock('../src/scripts/authStore.js', () => ({
  default: {
    getUserByAccessToken: vi.fn(),
  },
}))

vi.mock('../src/composables/useComponentCache.js', () => ({
  useComponentCache: vi.fn(() => ({
    needsRefresh: vi.fn(() => false),
    markAsRefreshed: vi.fn(),
  })),
}))

import AuthStore from '../src/scripts/authStore.js'
import { useComponentCache } from '../src/composables/useComponentCache.js'

describe('TeamsView', () => {
  let wrapper
  let router
  let pinia
  let fetchMock
  let cacheComposable

  const mockTeams = [
    createMockTeam({
      teamId: '1',
      title: 'Development Team',
      category: 'Development',
      completionPercentage: 75,
    }),
    createMockTeam({
      teamId: '2',
      title: 'Design Team',
      category: 'Design',
      completionPercentage: 50,
    }),
    createMockTeam({
      teamId: '3',
      title: 'Marketing Team',
      category: 'Marketing',
      completionPercentage: 90,
    }),
    createMockTeam({
      teamId: '4',
      title: 'Sales Team',
      category: 'Sales',
      completionPercentage: 30,
    }),
    createMockTeam({
      teamId: '5',
      title: 'Support Team',
      category: 'Support',
      completionPercentage: 60,
    }),
    createMockTeam({
      teamId: '6',
      title: 'Operations Team',
      category: 'Operations',
      completionPercentage: 40,
    }),
    createMockTeam({
      teamId: '7',
      title: 'Dev Team 2',
      category: 'Development',
      completionPercentage: 85,
    }),
  ]

  const mockAdminTeams = [
    createMockTeam({ teamId: '1', title: 'Development Team', category: 'Development' }),
  ]

  beforeEach(() => {
    // Setup mocks
    fetchMock = setupFetchMock()
    pinia = createTestPinia()

    // Mock cache composable with spy functions
    cacheComposable = {
      needsRefresh: vi.fn(() => false),
      markAsRefreshed: vi.fn(),
    }
    useComponentCache.mockReturnValue(cacheComposable)

    // Create router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/teams', name: 'Teams', component: TeamsView },
        {
          path: '/teams/:teamId',
          name: 'TeamDetails',
          component: { template: '<div>Team Details</div>' },
        },
      ],
    })

    // Mock environment variables
    import.meta.env.VITE_API_PORT = 'http://localhost:3000'

    // Mock user authentication
    const mockUser = createMockUser()
    AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mountTeamsView = async (options = {}) => {
    wrapper = mount(TeamsView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'v-container': false,
          'v-row': false,
          'v-col': false,
          'v-card': false,
          'v-card-title': false,
          'v-card-text': false,
          'v-btn': false,
          'v-icon': false,
          'v-text-field': false,
          'v-select': false,
          'v-chip': false,
          'v-progress-linear': false,
          'v-pagination': false,
          'v-skeleton-loader': false,
          NewTeams: true,
        },
        ...options,
      },
    })
    await flushPromises()
    return wrapper
  }

  describe('Component Initialization', () => {
    it('should display loading skeleton while fetching teams', async () => {
      // Arrange - delay fetch responses
      fetchMock.mockImplementation(() => new Promise(() => {}))

      // Act
      await mountTeamsView()

      // Assert
      expect(wrapper.vm.isLoadingTeams).toBe(true)
      const skeletons = wrapper.findAllComponents({ name: 'v-skeleton-loader' })
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should fetch user, admin teams, and user teams on mount', async () => {
      // Arrange
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      await mountTeamsView()
      await flushPromises()

      // Assert
      expect(AuthStore.getUserByAccessToken).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams/admin',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/teams',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      )
      expect(wrapper.vm.userLoaded).toBe(true)
      expect(wrapper.vm.isLoadingTeams).toBe(false)
    })

    it('should populate teams data correctly', async () => {
      // Arrange
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      await mountTeamsView()
      await flushPromises()

      // Assert
      expect(wrapper.vm.userTeams).toHaveLength(7)
      expect(wrapper.vm.teamsThatUserIsAdmin).toHaveLength(1)
    })
  })

  describe('Team Display', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should render team cards for all teams', async () => {
      // Act
      await mountTeamsView()
      await flushPromises()

      // Assert
      const cards = wrapper.findAll('.v-card')
      // Should show 6 teams on first page (6 per page)
      expect(cards.length).toBeGreaterThanOrEqual(6)
    })

    it('should display team information correctly', async () => {
      // Act
      await mountTeamsView()
      await flushPromises()

      // Assert
      const firstTeam = wrapper.vm.paginatedTeams[0]
      expect(wrapper.text()).toContain(firstTeam.title)
      expect(wrapper.text()).toContain(firstTeam.category)
    })

    it('should show completion progress for teams', async () => {
      // Act
      await mountTeamsView()
      await flushPromises()

      // Assert
      const progressBars = wrapper.findAllComponents({ name: 'v-progress-linear' })
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  describe('Search Functionality', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should filter teams by search query', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      const searchField = wrapper.find('input[type="text"]')
      await searchField.setValue('Development')
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTeams).toHaveLength(2) // "Development Team" and "Dev Team 2"
      expect(wrapper.vm.filteredTeams.every((t) => t.title.toLowerCase().includes('dev'))).toBe(
        true,
      )
    })

    it('should be case-insensitive when searching', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      const searchField = wrapper.find('input[type="text"]')
      await searchField.setValue('DESIGN')
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTeams).toHaveLength(1)
      expect(wrapper.vm.filteredTeams[0].title).toBe('Design Team')
    })

    it('should reset pagination when searching', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Set to page 2
      wrapper.vm.currentPage = 2
      await nextTick()

      // Act
      const searchField = wrapper.find('input[type="text"]')
      await searchField.setValue('Support')
      await nextTick()

      // Assert
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('should show no results message when search yields no teams', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      const searchField = wrapper.find('input[type="text"]')
      await searchField.setValue('NonexistentTeam')
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTeams).toHaveLength(0)
    })
  })

  describe('Category Filtering', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should filter teams by category', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      wrapper.vm.selectedCategory = 'Development'
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTeams).toHaveLength(2)
      expect(wrapper.vm.filteredTeams.every((t) => t.category === 'Development')).toBe(true)
    })

    it('should show category counts in filter dropdown', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      const categoryItems = wrapper.vm.categoryItemsWithCounts

      // Assert
      const devCategory = categoryItems.find((c) => c.value === 'Development')
      expect(devCategory.title).toContain('(2)') // 2 development teams
    })

    it('should only show categories with teams', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      const categoryItems = wrapper.vm.categoryItemsWithCounts

      // Assert
      expect(categoryItems.every((item) => !item.disabled)).toBe(true)
    })

    it('should clear category filter', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()
      wrapper.vm.selectedCategory = 'Development'
      await nextTick()

      // Act
      wrapper.vm.clearFilters()
      await nextTick()

      // Assert
      expect(wrapper.vm.selectedCategory).toBe('')
      expect(wrapper.vm.filteredTeams).toHaveLength(7)
    })

    it('should combine search and category filters', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      wrapper.vm.searchQuery = 'Team'
      wrapper.vm.selectedCategory = 'Development'
      await nextTick()

      // Assert
      expect(wrapper.vm.filteredTeams).toHaveLength(1) // Only "Development Team"
      expect(wrapper.vm.filteredTeams[0].title).toBe('Development Team')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should paginate teams correctly', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Assert - first page
      expect(wrapper.vm.paginatedTeams).toHaveLength(6) // 6 teams per page
      expect(wrapper.vm.totalPages).toBe(2) // 7 teams / 6 per page = 2 pages
    })

    it('should navigate to next page', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      wrapper.vm.handlePageChange(2)
      await nextTick()

      // Assert
      expect(wrapper.vm.currentPage).toBe(2)
      expect(wrapper.vm.paginatedTeams).toHaveLength(1) // 1 team on second page
    })

    it('should apply transition effect when changing pages', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      wrapper.vm.handlePageChange(2)

      // Assert - transition flag should be set
      expect(wrapper.vm.isTransitioning).toBe(true)

      // Wait for transition to complete
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(wrapper.vm.isTransitioning).toBe(false)
    })

    it('should update total pages when filtering', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      wrapper.vm.searchQuery = 'Development'
      await nextTick()

      // Assert
      expect(wrapper.vm.totalPages).toBe(1) // 2 teams fit on 1 page
    })
  })

  describe('Team Navigation', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should navigate to team details when clicking a card', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()
      const pushSpy = vi.spyOn(router, 'push')

      // Act
      wrapper.vm.navigateToTeam('1')
      await flushPromises()

      // Assert
      expect(pushSpy).toHaveBeenCalledWith('/teams/1')
    })
  })

  describe('New Team Dialog', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should toggle new team dialog', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      wrapper.vm.isCreatingNewTeam = true
      await nextTick()

      // Assert
      expect(wrapper.vm.isCreatingNewTeam).toBe(true)
      const newTeamsDialog = wrapper.findComponent({ name: 'NewTeams' })
      expect(newTeamsDialog.exists()).toBe(true)
    })

    it('should render NewTeams component only when user is loaded', async () => {
      // Arrange
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolve
      await mountTeamsView()

      // Assert - should not show NewTeams when user is not loaded
      expect(wrapper.vm.userLoaded).toBe(false)
      const newTeamsDialog = wrapper.findComponent({ name: 'NewTeams' })
      expect(newTeamsDialog.exists()).toBe(false)
    })
  })

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should refresh teams data when refresh button is clicked', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()
      fetchMock.mockClear()

      // Act
      await wrapper.vm.handleRefresh()
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalled()
      expect(wrapper.vm.isLoadingTeams).toBe(false)
    })

    it('should show loading state during refresh', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act
      const refreshPromise = wrapper.vm.handleRefresh()

      // Assert - should be loading
      expect(wrapper.vm.isLoadingTeams).toBe(true)

      await refreshPromise
      await flushPromises()

      // Should finish loading
      expect(wrapper.vm.isLoadingTeams).toBe(false)
    })

    it('should handle team updated event', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()
      fetchMock.mockClear()

      // Act
      await wrapper.vm.handleTeamUpdated()
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalled() // Should refetch teams
    })
  })

  describe('Keep-Alive Cache Integration', () => {
    it('should use cached data when needsRefresh returns false', async () => {
      // Arrange
      cacheComposable.needsRefresh.mockReturnValue(false)
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      await mountTeamsView()
      await flushPromises()

      // Clear fetch calls
      fetchMock.mockClear()

      // Act - simulate reactivation
      if (wrapper.vm.$options.activated) {
        await wrapper.vm.$options.activated[0].call(wrapper.vm)
      }
      await flushPromises()

      // Assert - should not fetch again
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should refresh data when needsRefresh returns true', async () => {
      // Arrange
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      await mountTeamsView()
      await flushPromises()

      // Set cache to need refresh
      cacheComposable.needsRefresh.mockReturnValue(true)
      fetchMock.mockClear()

      // Act - simulate reactivation
      if (wrapper.vm.$options.activated) {
        await wrapper.vm.$options.activated[0].call(wrapper.vm)
      }
      await flushPromises()

      // Assert - should fetch again
      expect(fetchMock).toHaveBeenCalled()
      expect(cacheComposable.markAsRefreshed).toHaveBeenCalledWith('TeamsView')
    })
  })

  describe('Progress Color Calculation', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/teams/admin')) {
          return mockFetchResponse(mockAdminTeams)
        }
        if (url.includes('/api/teams')) {
          return mockFetchResponse(mockTeams)
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })
    })

    it('should return correct colors for different progress percentages', async () => {
      // Arrange
      await mountTeamsView()
      await flushPromises()

      // Act & Assert
      expect(wrapper.vm.getProgressColor(10)).toBe('red-darken-2')
      expect(wrapper.vm.getProgressColor(20)).toBe('red')
      expect(wrapper.vm.getProgressColor(30)).toBe('orange-darken-2')
      expect(wrapper.vm.getProgressColor(45)).toBe('orange')
      expect(wrapper.vm.getProgressColor(60)).toBe('yellow-darken-2')
      expect(wrapper.vm.getProgressColor(70)).toBe('yellow')
      expect(wrapper.vm.getProgressColor(80)).toBe('light-green')
      expect(wrapper.vm.getProgressColor(95)).toBe('green')
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      // Arrange
      fetchMock.mockRejectedValue(new Error('Network error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      await mountTeamsView()
      await flushPromises()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(wrapper.vm.isLoadingTeams).toBe(false)

      consoleErrorSpy.mockRestore()
    })
  })
})
