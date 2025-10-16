/**
 * TaskSubmission Component Tests
 * Tests task submission dialog, field validation, image uploads, and form handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TaskSubmission from '../src/components/TaskSubmission.vue'
import {
  createTestPinia,
  setupFetchMock,
  mockFetchResponse,
  createMockUser,
  createMockTask,
  createMockTaskDesign,
  mockFileReader,
  mockCanvas,
  flushPromises,
} from './helpers.js'

describe('TaskSubmission Component', () => {
  let wrapper
  let pinia
  let fetchMock
  let fileReader

  const mockUser = createMockUser()

  const createTaskWithDesign = (fieldTypes = ['Short text']) => {
    return createMockTask({
      taskId: 'task-1',
      title: 'Test Task',
      teamId: 'team-1',
      taskGroupId: 'group-1',
      design: createMockTaskDesign(fieldTypes),
    })
  }

  const defaultProps = {
    dialog: true,
    userProps: mockUser,
    teamId: 'team-1',
    taskId: 'task-1',
    task: createTaskWithDesign(),
  }

  beforeEach(() => {
    fetchMock = setupFetchMock()
    pinia = createTestPinia()
    fileReader = mockFileReader()
    mockCanvas()
    import.meta.env.VITE_API_PORT = 'http://localhost:3000'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mountTaskSubmission = async (propsOverride = {}) => {
    wrapper = mount(TaskSubmission, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-dialog': false,
          'v-card': false,
          'v-card-title': false,
          'v-card-text': false,
          'v-card-actions': false,
          'v-text-field': false,
          'v-textarea': false,
          'v-select': false,
          'v-file-input': false,
          'v-btn': false,
          'v-icon': false,
          'v-alert': false,
          'v-chip': false,
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
      await mountTaskSubmission()

      // Assert
      const dialog = wrapper.findComponent({ name: 'v-dialog' })
      expect(dialog.exists()).toBe(true)
    })

    it('should initialize form with task design fields', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text', 'Number', 'Date'])

      // Act
      await mountTaskSubmission({ task })

      // Assert
      expect(wrapper.vm.submissionForm.submissionData).toHaveLength(3)
      expect(wrapper.vm.formValues['Field 1']).toBeDefined()
      expect(wrapper.vm.formValues['Field 2']).toBeDefined()
      expect(wrapper.vm.formValues['Field 3']).toBeDefined()
    })

    it('should set default values for different field types', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text', 'Number', 'Date', 'Select'])

      // Act
      await mountTaskSubmission({ task })

      // Assert
      expect(typeof wrapper.vm.formValues['Field 1']).toBe('string') // Short text
      expect(typeof wrapper.vm.formValues['Field 2']).toBe('number') // Number
      expect(wrapper.vm.formValues['Field 3']).toMatch(/\d{4}-\d{2}-\d{2}/) // Date format
      expect(wrapper.vm.formValues['Field 4']).toBeTruthy() // Select has option
    })
  })

  describe('Default Value Handling', () => {
    it('should return empty string for optional short text', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = false

      // Act
      await mountTaskSubmission({ task })
      const defaultValue = wrapper.vm.getDefaultValueForField(task.design.fields[0])

      // Assert
      expect(defaultValue).toBe('(Not provided)')
    })

    it('should return required empty string for required short text', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true

      // Act
      await mountTaskSubmission({ task })
      const defaultValue = wrapper.vm.getDefaultValueForField(task.design.fields[0])

      // Assert
      expect(defaultValue).toBe('')
    })

    it('should return min value for number fields', async () => {
      // Arrange
      const task = createTaskWithDesign(['Number'])
      task.design.fields[0].config.min = 5

      // Act
      await mountTaskSubmission({ task })
      const defaultValue = wrapper.vm.getDefaultValueForField(task.design.fields[0])

      // Assert
      expect(defaultValue).toBe(5)
    })

    it('should return first option for select fields', async () => {
      // Arrange
      const task = createTaskWithDesign(['Select'])
      task.design.fields[0].config.options = ['Option A', 'Option B']

      // Act
      await mountTaskSubmission({ task })
      const defaultValue = wrapper.vm.getDefaultValueForField(task.design.fields[0])

      // Assert
      expect(defaultValue).toBe('Option A')
    })

    it('should return current date for date fields', async () => {
      // Arrange
      const task = createTaskWithDesign(['Date'])

      // Act
      await mountTaskSubmission({ task })
      const defaultValue = wrapper.vm.getDefaultValueForField(task.design.fields[0])

      // Assert
      expect(defaultValue).toMatch(/\d{4}-\d{2}-\d{2}/)
    })
  })

  describe('Form Input Handling', () => {
    it('should update form values for text input', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 'Test input'
      await nextTick()

      // Assert
      expect(wrapper.vm.formValues['Field 1']).toBe('Test input')
    })

    it('should update form values for number input', async () => {
      // Arrange
      const task = createTaskWithDesign(['Number'])
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 42
      await nextTick()

      // Assert
      expect(wrapper.vm.formValues['Field 1']).toBe(42)
    })

    it('should update form values for select input', async () => {
      // Arrange
      const task = createTaskWithDesign(['Select'])
      task.design.fields[0].config.options = ['Option 1', 'Option 2', 'Option 3']
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 'Option 2'
      await nextTick()

      // Assert
      expect(wrapper.vm.formValues['Field 1']).toBe('Option 2')
    })

    it('should update submission data when form values change', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 'Updated value'
      wrapper.vm.updateSubmissionData()
      await nextTick()

      // Assert
      const fieldData = wrapper.vm.submissionForm.submissionData.find((f) => f.label === 'Field 1')
      expect(fieldData.value).toBe('Updated value')
    })
  })

  describe('Validation', () => {
    it('should validate required fields', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = ''
      const isValid = wrapper.vm.validateForm()

      // Assert
      expect(isValid).toBe(false)
      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.message).toContain('required field')
    })

    it('should pass validation when required fields are filled', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 'Valid input'
      const isValid = wrapper.vm.validateForm()

      // Assert
      expect(isValid).toBe(true)
      expect(wrapper.vm.error).toBe(false)
    })

    it('should validate number field minimum constraint', async () => {
      // Arrange
      const task = createTaskWithDesign(['Number'])
      task.design.fields[0].config.required = true
      task.design.fields[0].config.min = 10
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 5
      const isValid = wrapper.vm.validateForm()

      // Assert
      expect(isValid).toBe(false)
      expect(wrapper.vm.message).toContain('at least 10')
    })

    it('should validate number field maximum constraint', async () => {
      // Arrange
      const task = createTaskWithDesign(['Number'])
      task.design.fields[0].config.required = true
      task.design.fields[0].config.max = 100
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 150
      const isValid = wrapper.vm.validateForm()

      // Assert
      expect(isValid).toBe(false)
      expect(wrapper.vm.message).toContain('not exceed 100')
    })

    it('should pass validation for numbers within range', async () => {
      // Arrange
      const task = createTaskWithDesign(['Number'])
      task.design.fields[0].config.required = true
      task.design.fields[0].config.min = 0
      task.design.fields[0].config.max = 100
      await mountTaskSubmission({ task })

      // Act
      wrapper.vm.formValues['Field 1'] = 50
      const isValid = wrapper.vm.validateForm()

      // Assert
      expect(isValid).toBe(true)
    })
  })

  describe('Image Upload Handling', () => {
    it('should handle image file upload', async () => {
      // Arrange
      const task = createTaskWithDesign(['Image'])
      await mountTaskSubmission({ task })

      const mockFile = new File(['image content'], 'test.png', { type: 'image/png' })
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      }

      // Act
      wrapper.vm.handleFileUpload('Field 1', mockEvent)
      await flushPromises()

      // Assert
      expect(fileReader.readAsDataURL).toHaveBeenCalledWith(mockFile)
      expect(wrapper.vm.formValues['Field 1']).toContain('data:image/png;base64')
    })

    it('should validate image file size', async () => {
      // Arrange
      const task = createTaskWithDesign(['Image'])
      await mountTaskSubmission({ task })

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

      const mockEvent = {
        target: {
          files: [largeFile],
        },
      }

      // Act
      wrapper.vm.handleFileUpload('Field 1', mockEvent)
      await flushPromises()

      // Assert
      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.message).toContain('File size too large')
    })

    it('should validate file type is image', async () => {
      // Arrange
      const task = createTaskWithDesign(['Image'])
      await mountTaskSubmission({ task })

      const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' })
      const mockEvent = {
        target: {
          files: [textFile],
        },
      }

      // Act
      wrapper.vm.handleFileUpload('Field 1', mockEvent)
      await flushPromises()

      // Assert
      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.message).toContain('valid image file')
    })

    it('should handle image compression for large files', async () => {
      // Arrange
      const task = createTaskWithDesign(['Image'])
      await mountTaskSubmission({ task })

      // Create a file larger than 1MB
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 })

      const mockEvent = {
        target: {
          files: [largeFile],
        },
      }

      // Act
      wrapper.vm.handleFileUpload('Field 1', mockEvent)
      await flushPromises()

      // Assert - compression logic should be triggered
      expect(fileReader.readAsDataURL).toHaveBeenCalled()
    })

    it('should handle required image field when no file provided', async () => {
      // Arrange
      const task = createTaskWithDesign(['Image'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })

      const mockEvent = {
        target: {
          files: null,
        },
      }

      // Act
      wrapper.vm.handleFileUpload('Field 1', mockEvent)
      await flushPromises()

      // Assert
      expect(wrapper.vm.formValues['Field 1']).toBeNull()
    })

    it('should handle optional image field when no file provided', async () => {
      // Arrange
      const task = createTaskWithDesign(['Image'])
      task.design.fields[0].config.required = false
      await mountTaskSubmission({ task })

      const mockEvent = {
        target: {
          files: null,
        },
      }

      // Act
      wrapper.vm.handleFileUpload('Field 1', mockEvent)
      await flushPromises()

      // Assert
      expect(wrapper.vm.formValues['Field 1']).toBe('(No image)')
    })
  })

  describe('Task Submission', () => {
    it('should submit task with valid data', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text', 'Number'])
      task.design.fields[0].config.required = true
      task.design.fields[1].config.required = true

      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = 'Test submission'
      wrapper.vm.formValues['Field 2'] = 42

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/tasks/submit',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.stringContaining('Test submission'),
        }),
      )
    })

    it('should include all required fields in submission', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text', 'Number', 'Date'])
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = 'Text value'
      wrapper.vm.formValues['Field 2'] = 50
      wrapper.vm.formValues['Field 3'] = '2024-12-31'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(callBody.submissionData).toHaveLength(3)
      expect(callBody.taskId).toBe('task-1')
      expect(callBody.userId).toBe(mockUser.userId)
      expect(callBody.teamId).toBe('team-1')
      expect(callBody.taskGroupId).toBe('group-1')
    })

    it('should provide default values for optional empty fields', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text', 'Number'])
      task.design.fields[0].config.required = false
      task.design.fields[1].config.required = false
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = ''
      wrapper.vm.formValues['Field 2'] = ''

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(callBody.submissionData[0].value).toBe('(Not provided)')
      expect(callBody.submissionData[1].value).toBe(0)
    })

    it('should emit submission-success event on success', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = 'Valid data'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      expect(wrapper.emitted('submission-success')).toBeTruthy()
      expect(wrapper.vm.success).toBe(true)
      expect(wrapper.vm.message).toContain('successful')
    })

    it('should not submit if validation fails', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })

      wrapper.vm.formValues['Field 1'] = '' // Empty required field

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      expect(fetchMock).not.toHaveBeenCalled()
      expect(wrapper.vm.error).toBe(true)
    })

    it('should handle submission error', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ message: 'Submission failed' }, false, 400),
      )

      wrapper.vm.formValues['Field 1'] = 'Valid data'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.success).toBe(false)
      expect(wrapper.vm.message).toContain('Submission failed')
    })

    it('should handle network error', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })
      fetchMock.mockRejectedValue(new Error('Network error'))

      wrapper.vm.formValues['Field 1'] = 'Valid data'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.message).toContain('error occurred')
    })

    it('should set loading state during submission', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolve

      wrapper.vm.formValues['Field 1'] = 'Valid data'

      // Act
      const promise = wrapper.vm.submitTaskResponse()

      // Assert
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should include submission date in payload', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = 'Data'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(callBody.submissionDate).toBeTruthy()
      expect(new Date(callBody.submissionDate)).toBeInstanceOf(Date)
    })
  })

  describe('Dialog Management', () => {
    it('should close dialog on closeDialog call', async () => {
      // Arrange
      await mountTaskSubmission()

      // Act
      wrapper.vm.closeDialog()
      await nextTick()

      // Assert
      expect(wrapper.emitted('update:dialog')).toBeTruthy()
      expect(wrapper.emitted('update:dialog')[0]).toEqual([false])
    })

    it('should reset form on close', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text'])
      await mountTaskSubmission({ task })
      wrapper.vm.formValues['Field 1'] = 'Modified value'
      wrapper.vm.success = true

      // Act
      wrapper.vm.resetForm()
      await nextTick()

      // Assert
      expect(wrapper.vm.success).toBe(false)
      expect(wrapper.vm.error).toBe(false)
      expect(wrapper.vm.message).toBe('')
    })

    it('should auto-close dialog after successful submission', async () => {
      // Arrange
      vi.useFakeTimers()
      const task = createTaskWithDesign(['Short text'])
      task.design.fields[0].config.required = true
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = 'Valid data'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Fast-forward timers
      vi.advanceTimersByTime(2000)
      await flushPromises()

      // Assert
      expect(wrapper.emitted('update:dialog')).toBeTruthy()

      vi.restoreAllTimers()
    })
  })

  describe('Multiple Field Types', () => {
    it('should handle form with all field types', async () => {
      // Arrange
      const task = createTaskWithDesign([
        'Short text',
        'Long text',
        'Number',
        'Date',
        'Select',
        'URLs',
        'Phone',
      ])
      await mountTaskSubmission({ task })

      // Act & Assert - all fields should be initialized
      expect(wrapper.vm.formValues['Field 1']).toBeDefined()
      expect(wrapper.vm.formValues['Field 2']).toBeDefined()
      expect(wrapper.vm.formValues['Field 3']).toBeDefined()
      expect(wrapper.vm.formValues['Field 4']).toBeDefined()
      expect(wrapper.vm.formValues['Field 5']).toBeDefined()
      expect(wrapper.vm.formValues['Field 6']).toBeDefined()
      expect(wrapper.vm.formValues['Field 7']).toBeDefined()
    })

    it('should submit form with mixed field types', async () => {
      // Arrange
      const task = createTaskWithDesign(['Short text', 'Number', 'Select'])
      task.design.fields[2].config.options = ['Option 1', 'Option 2']
      await mountTaskSubmission({ task })
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))

      wrapper.vm.formValues['Field 1'] = 'Text input'
      wrapper.vm.formValues['Field 2'] = 25
      wrapper.vm.formValues['Field 3'] = 'Option 2'

      // Act
      await wrapper.vm.submitTaskResponse()
      await flushPromises()

      // Assert
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(callBody.submissionData[0].value).toBe('Text input')
      expect(callBody.submissionData[1].value).toBe(25)
      expect(callBody.submissionData[2].value).toBe('Option 2')
    })
  })

  describe('Priority Display', () => {
    it('should get correct priority color', async () => {
      // Arrange
      await mountTaskSubmission()

      // Act & Assert
      expect(wrapper.vm.getPriorityColor('Urgent')).toBe('red-darken-2')
      expect(wrapper.vm.getPriorityColor('High')).toBe('orange-darken-1')
      expect(wrapper.vm.getPriorityColor('Medium')).toBe('green-darken-1')
      expect(wrapper.vm.getPriorityColor('Low')).toBe('blue-darken-1')
      expect(wrapper.vm.getPriorityColor('Optional')).toBe('grey-darken-3')
    })
  })
})
