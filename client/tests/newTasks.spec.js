/**
 * NewTasks Component Tests
 * Tests task creation dialog, dynamic field builder, and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NewTasks from '../src/components/NewTasks.vue'
import {
  createTestPinia,
  setupFetchMock,
  mockFetchResponse,
  createMockUser,
  createMockTeamMember,
  flushPromises,
} from './helpers.js'

// Mock permission service
vi.mock('../src/scripts/permissionService.js', () => ({
  permissionService: {
    hasPermission: vi.fn(() => true),
  },
}))

describe('NewTasks Component', () => {
  let wrapper
  let pinia
  let fetchMock

  const mockUser = createMockUser()
  const mockTeamMembers = [
    createMockTeamMember({ userId: '123', username: 'user1', roleType: 'admin' }),
    createMockTeamMember({ userId: '456', username: 'user2', roleType: 'member' }),
    createMockTeamMember({ userId: '789', username: 'user3', roleType: 'member' }),
  ]

  const defaultProps = {
    dialog: true,
    userProps: mockUser,
    teamId: 'team-1',
    teamMembers: mockTeamMembers,
  }

  beforeEach(() => {
    fetchMock = setupFetchMock()
    pinia = createTestPinia()
    import.meta.env.VITE_API_PORT = 'http://localhost:3000'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mountNewTasks = async (propsOverride = {}) => {
    wrapper = mount(NewTasks, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-dialog': false,
          'v-card': false,
          'v-card-title': false,
          'v-card-text': false,
          'v-stepper': false,
          'v-stepper-header': false,
          'v-stepper-item': false,
          'v-stepper-window': false,
          'v-stepper-window-item': false,
          'v-text-field': false,
          'v-textarea': false,
          'v-select': false,
          'v-slider': false,
          'v-checkbox': false,
          'v-btn': false,
          'v-chip': false,
          'v-icon': false,
          'v-divider': false,
          'v-row': false,
          'v-col': false,
        },
      },
      props: {
        ...defaultProps,
        ...propsOverride,
      },
    })
    await flushPromises()
    return wrapper
  }

  describe('Component Initialization', () => {
    it('should render dialog when dialog prop is true', async () => {
      // Act
      await mountNewTasks()

      // Assert
      expect(wrapper.vm.dialog).toBe(true)
      const dialog = wrapper.findComponent({ name: 'v-dialog' })
      expect(dialog.exists()).toBe(true)
    })

    it('should initialize with user props', async () => {
      // Act
      await mountNewTasks()

      // Assert
      expect(wrapper.vm.user.userId).toBe(mockUser.userId)
      expect(wrapper.vm.user.username).toBe(mockUser.username)
      expect(wrapper.vm.user.email).toBe(mockUser.email)
    })

    it('should set teamId from props', async () => {
      // Act
      await mountNewTasks()

      // Assert
      expect(wrapper.vm.taskForm.teamId).toBe('team-1')
    })

    it('should start on step 1 (Basic Info)', async () => {
      // Act
      await mountNewTasks()

      // Assert
      expect(wrapper.vm.currentStep).toBe(1)
    })
  })

  describe('Two-Step Workflow', () => {
    it('should have step 1 for basic info and step 2 for dynamic fields', async () => {
      // Act
      await mountNewTasks()

      // Assert
      expect(wrapper.vm.currentStep).toBe(1)

      // Navigate to step 2
      wrapper.vm.currentStep = 2
      await nextTick()

      expect(wrapper.vm.currentStep).toBe(2)
    })

    it('should validate required fields before proceeding to step 2', async () => {
      // Arrange
      await mountNewTasks()

      // Act - try with empty fields
      const allFilled = wrapper.vm.allFilled

      // Assert
      expect(allFilled).toBe(false)
    })

    it('should allow proceeding to step 2 when all required fields are filled', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.title = 'Test Task'
      wrapper.vm.taskForm.startDate = '2024-01-01'
      wrapper.vm.taskForm.dueDate = '2024-12-31'
      wrapper.vm.selectedUsers = ['123']
      await nextTick()

      // Assert
      expect(wrapper.vm.allFilled).toBe(true)
    })

    it('should validate start date is before due date', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.title = 'Test Task'
      wrapper.vm.taskForm.startDate = '2024-12-31'
      wrapper.vm.taskForm.dueDate = '2024-01-01'
      wrapper.vm.selectedUsers = ['123']
      await nextTick()

      // Assert
      expect(wrapper.vm.allFilled).toBe(false)
    })
  })

  describe('Basic Task Information', () => {
    it('should update task title', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.title = 'New Task Title'
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.title).toBe('New Task Title')
    })

    it('should select task category', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.category = 'Development'
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.category).toBe('Development')
    })

    it('should set task priority', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.priority = 'Urgent'
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.priority).toBe('Urgent')
    })

    it('should set task weight', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.weighted = 10
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.weighted).toBe(10)
    })

    it('should add task description', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.taskForm.description = 'This is a test task description'
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.description).toBe('This is a test task description')
    })
  })

  describe('Tag Management', () => {
    it('should add a tag', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newTag = 'frontend'
      wrapper.vm.addTag()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.tags).toContain('frontend')
      expect(wrapper.vm.newTag).toBe('')
    })

    it('should not add duplicate tags', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.taskForm.tags = ['frontend']

      // Act
      wrapper.vm.newTag = 'frontend'
      wrapper.vm.addTag()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.tags).toHaveLength(1)
    })

    it('should remove a tag', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.taskForm.tags = ['frontend', 'backend']

      // Act
      wrapper.vm.removeTag('frontend')
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.tags).not.toContain('frontend')
      expect(wrapper.vm.taskForm.tags).toContain('backend')
    })
  })

  describe('User Assignment', () => {
    it('should select individual users', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.selectedUsers = ['123', '456']
      await nextTick()

      // Assert
      expect(wrapper.vm.selectedUsers).toHaveLength(2)
      expect(wrapper.vm.selectedUsers).toContain('123')
      expect(wrapper.vm.selectedUsers).toContain('456')
    })

    it('should select all users', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.selectAllUsers()
      await nextTick()

      // Assert
      expect(wrapper.vm.selectedUsers).toHaveLength(3)
      expect(wrapper.vm.selectedUsers).toEqual(['123', '456', '789'])
    })

    it('should remove selected user', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.selectedUsers = ['123', '456', '789']

      // Act
      wrapper.vm.removeSelectedUser('456')
      await nextTick()

      // Assert
      expect(wrapper.vm.selectedUsers).toHaveLength(2)
      expect(wrapper.vm.selectedUsers).not.toContain('456')
    })

    it('should get user name from team members', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      const userName = wrapper.vm.getUserName('123')

      // Assert
      expect(userName).toBe('user1')
    })

    it('should get user role from team members', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      const userRole = wrapper.vm.getUserRole('123')

      // Assert
      expect(userRole).toBeTruthy()
    })
  })

  describe('Dynamic Field Creation', () => {
    it('should add a short text field', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Name'
      wrapper.vm.newField.type = 'Short text'
      wrapper.vm.newField.config.required = true
      wrapper.vm.addField()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields).toHaveLength(1)
      expect(wrapper.vm.taskForm.design.fields[0].label).toBe('Name')
      expect(wrapper.vm.taskForm.design.fields[0].type).toBe('Short text')
      expect(wrapper.vm.taskForm.design.fields[0].config.required).toBe(true)
      expect(wrapper.vm.taskForm.design.numberOfFields).toBe(1)
    })

    it('should add a number field with min/max', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Score'
      wrapper.vm.newField.type = 'Number'
      wrapper.vm.newField.config.min = 0
      wrapper.vm.newField.config.max = 100
      wrapper.vm.addField()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields).toHaveLength(1)
      expect(wrapper.vm.taskForm.design.fields[0].type).toBe('Number')
      expect(wrapper.vm.taskForm.design.fields[0].config.min).toBe(0)
      expect(wrapper.vm.taskForm.design.fields[0].config.max).toBe(100)
    })

    it('should add a select field with options', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Status'
      wrapper.vm.newField.type = 'Select'
      wrapper.vm.newField.config.options = ['Option 1', 'Option 2', 'Option 3']
      wrapper.vm.addField()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields).toHaveLength(1)
      expect(wrapper.vm.taskForm.design.fields[0].type).toBe('Select')
      expect(wrapper.vm.taskForm.design.fields[0].config.options).toHaveLength(3)
    })

    it('should add multiple fields', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Field 1'
      wrapper.vm.addField()

      wrapper.vm.newField.label = 'Field 2'
      wrapper.vm.addField()

      wrapper.vm.newField.label = 'Field 3'
      wrapper.vm.addField()

      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields).toHaveLength(3)
      expect(wrapper.vm.taskForm.design.numberOfFields).toBe(3)
    })

    it('should remove a field', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.newField.label = 'Field to Remove'
      wrapper.vm.addField()
      await nextTick()

      const fieldToRemove = wrapper.vm.taskForm.design.fields[0]

      // Act
      wrapper.vm.removeField(fieldToRemove)
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields).toHaveLength(0)
      expect(wrapper.vm.taskForm.design.numberOfFields).toBe(0)
    })

    it('should reset field form after adding', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Test Field'
      wrapper.vm.newField.type = 'Number'
      wrapper.vm.newField.config.required = true
      wrapper.vm.addField()
      await nextTick()

      // Assert - form should be reset
      expect(wrapper.vm.newField.label).toBe('')
      expect(wrapper.vm.newField.type).toBe('Short text')
      expect(wrapper.vm.newField.config.required).toBe(false)
    })

    it('should not add field without label', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = ''
      wrapper.vm.addField()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields).toHaveLength(0)
    })

    it('should clean up config for non-select fields', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Text Field'
      wrapper.vm.newField.type = 'Short text'
      wrapper.vm.newField.config.options = ['Option 1'] // Should be removed
      wrapper.vm.addField()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields[0].config.options).toBeUndefined()
    })

    it('should clean up config for non-number fields', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newField.label = 'Text Field'
      wrapper.vm.newField.type = 'Short text'
      wrapper.vm.newField.config.min = 0
      wrapper.vm.newField.config.max = 100
      wrapper.vm.addField()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.design.fields[0].config.min).toBeUndefined()
      expect(wrapper.vm.taskForm.design.fields[0].config.max).toBeUndefined()
    })
  })

  describe('Select Field Options', () => {
    it('should add option to select field', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.newOption = 'Option 1'
      wrapper.vm.addOption()
      await nextTick()

      // Assert
      expect(wrapper.vm.newField.config.options).toContain('Option 1')
      expect(wrapper.vm.newOption).toBe('')
    })

    it('should not add duplicate options', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.newField.config.options = ['Option 1']

      // Act
      wrapper.vm.newOption = 'Option 1'
      wrapper.vm.addOption()
      await nextTick()

      // Assert
      expect(wrapper.vm.newField.config.options).toHaveLength(1)
    })

    it('should remove option from select field', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.newField.config.options = ['Option 1', 'Option 2']

      // Act
      wrapper.vm.removeOption('Option 1')
      await nextTick()

      // Assert
      expect(wrapper.vm.newField.config.options).not.toContain('Option 1')
      expect(wrapper.vm.newField.config.options).toContain('Option 2')
    })
  })

  describe('Preview Functionality', () => {
    it('should generate preview data', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.taskForm.title = 'Preview Task'
      wrapper.vm.taskForm.description = 'Preview description'
      wrapper.vm.taskForm.priority = 'High'

      // Act
      const preview = wrapper.vm.previewData

      // Assert
      expect(preview.title).toBe('Preview Task')
      expect(preview.description).toBe('Preview description')
      expect(preview.priority).toBe('High')
    })

    it('should show default values in preview when fields are empty', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      const preview = wrapper.vm.previewData

      // Assert
      expect(preview.title).toBe('Task Title')
      expect(preview.description).toBe('Task description...')
    })

    it('should get correct preview value for different field types', async () => {
      // Arrange
      await mountNewTasks()

      // Act & Assert
      expect(wrapper.vm.getFieldPreviewValue({ type: 'Short text' })).toBe('Sample text')
      expect(wrapper.vm.getFieldPreviewValue({ type: 'Number', config: { min: 5 } })).toBe(5)
      expect(
        wrapper.vm.getFieldPreviewValue({ type: 'Select', config: { options: ['A', 'B'] } }),
      ).toBe('A')
      expect(wrapper.vm.getFieldPreviewValue({ type: 'URLs' })).toBe('https://example.com')
      expect(wrapper.vm.getFieldPreviewValue({ type: 'Image' })).toBe('[Image placeholder]')
    })

    it('should get priority color', async () => {
      // Arrange
      await mountNewTasks()

      // Act & Assert
      expect(wrapper.vm.getPriorityColor('Urgent')).toBe('red-darken-2')
      expect(wrapper.vm.getPriorityColor('High')).toBe('orange-darken-1')
      expect(wrapper.vm.getPriorityColor('Medium')).toBe('green-darken-1')
      expect(wrapper.vm.getPriorityColor('Low')).toBe('blue-darken-1')
      expect(wrapper.vm.getPriorityColor('Optional')).toBe('grey-darken-3')
    })
  })

  describe('Task Submission', () => {
    it('should create task with valid data', async () => {
      // Arrange
      await mountNewTasks()
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.taskForm.title = 'New Task'
      wrapper.vm.taskForm.startDate = '2024-01-01'
      wrapper.vm.taskForm.dueDate = '2024-12-31'
      wrapper.vm.selectedUsers = ['123']

      wrapper.vm.newField.label = 'Field 1'
      wrapper.vm.addField()

      // Act
      await wrapper.vm.createTask()
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/tasks/create',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.stringContaining('New Task'),
        }),
      )
    })

    it('should include assigned users in submission', async () => {
      // Arrange
      await mountNewTasks()
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.taskForm.title = 'Task with Assignees'
      wrapper.vm.taskForm.startDate = '2024-01-01'
      wrapper.vm.taskForm.dueDate = '2024-12-31'
      wrapper.vm.selectedUsers = ['123', '456']

      wrapper.vm.newField.label = 'Field 1'
      wrapper.vm.addField()

      // Act
      await wrapper.vm.createTask()
      await flushPromises()

      // Assert
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(callBody.assignedUsers).toEqual(['123', '456'])
    })

    it('should not create task without title', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.taskForm.title = ''

      // Act
      await wrapper.vm.createTask()

      // Assert
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should not create task without fields', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.taskForm.title = 'Task'
      wrapper.vm.taskForm.design.fields = []

      // Act
      await wrapper.vm.createTask()

      // Assert
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should handle empty description', async () => {
      // Arrange
      await mountNewTasks()
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.taskForm.title = 'Task'
      wrapper.vm.taskForm.startDate = '2024-01-01'
      wrapper.vm.taskForm.dueDate = '2024-12-31'
      wrapper.vm.taskForm.description = undefined
      wrapper.vm.selectedUsers = ['123']

      wrapper.vm.newField.label = 'Field 1'
      wrapper.vm.addField()

      // Act
      await wrapper.vm.createTask()
      await flushPromises()

      // Assert
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(callBody.description).toBe('')
    })
  })

  describe('Dialog Management', () => {
    it('should emit update:dialog event on close', async () => {
      // Arrange
      await mountNewTasks()

      // Act
      wrapper.vm.closeDialog()
      await nextTick()

      // Assert
      expect(wrapper.emitted('update:dialog')).toBeTruthy()
      expect(wrapper.emitted('update:dialog')[0]).toEqual([false])
    })

    it('should emit create-task event with form data', async () => {
      // Arrange
      await mountNewTasks()
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.taskForm.title = 'Task'
      wrapper.vm.taskForm.startDate = '2024-01-01'
      wrapper.vm.taskForm.dueDate = '2024-12-31'
      wrapper.vm.selectedUsers = ['123']

      wrapper.vm.newField.label = 'Field 1'
      wrapper.vm.addField()

      // Act
      await wrapper.vm.createTask()
      await flushPromises()

      // Assert
      expect(wrapper.emitted('create-task')).toBeTruthy()
    })

    it('should reset form on close', async () => {
      // Arrange
      await mountNewTasks()
      wrapper.vm.taskForm.title = 'Test'
      wrapper.vm.taskForm.tags = ['tag1']
      wrapper.vm.selectedUsers = ['123']

      // Act
      wrapper.vm.resetForm()
      await nextTick()

      // Assert
      expect(wrapper.vm.taskForm.title).toBe('')
      expect(wrapper.vm.taskForm.tags).toHaveLength(0)
      expect(wrapper.vm.selectedUsers).toHaveLength(0)
      expect(wrapper.vm.currentStep).toBe(1)
    })
  })

  describe('Loading State', () => {
    it('should show loading state during task creation', async () => {
      // Arrange
      await mountNewTasks()
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolve

      wrapper.vm.taskForm.title = 'Task'
      wrapper.vm.taskForm.startDate = '2024-01-01'
      wrapper.vm.taskForm.dueDate = '2024-12-31'
      wrapper.vm.selectedUsers = ['123']

      wrapper.vm.newField.label = 'Field 1'
      wrapper.vm.addField()

      // Act
      const promise = wrapper.vm.createTask()

      // Assert
      expect(wrapper.vm.loading).toBe(true)
    })
  })
})
