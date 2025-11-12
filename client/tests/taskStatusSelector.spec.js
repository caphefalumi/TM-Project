/**
 * TaskStatusSelector Component Tests
 * Tests task status selector functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskStatusSelector from '../src/components/TaskStatusSelector.vue'
import { setupFetchMock, mockFetchResponse, flushPromises } from './helpers.js'

describe('TaskStatusSelector Component', () => {
  let wrapper
  let fetchMock

  const defaultProps = {
    status: 'To Do',
    taskId: 'task-123',
    disabled: false,
  }

  beforeEach(() => {
    fetchMock = setupFetchMock()
    import.meta.env.VITE_API_PORT = 'http://localhost:3000'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mountComponent = async (propsOverride = {}) => {
    wrapper = mount(TaskStatusSelector, {
      props: {
        ...defaultProps,
        ...propsOverride,
      },
      global: {
        stubs: {
          'v-select': false,
          'v-chip': false,
          'v-icon': false,
          'v-list-item': false,
        },
      },
    })
    await wrapper.vm.$nextTick()
  }

  it('renders with initial status', async () => {
    await mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays correct status options', async () => {
    await mountComponent()
    const statusOptions = wrapper.vm.statusOptions
    expect(statusOptions).toContain('To Do')
    expect(statusOptions).toContain('In Progress')
    expect(statusOptions).toContain('In Review')
    expect(statusOptions).toContain('Done')
    expect(statusOptions).toContain('Blocked')
  })

  it('emits statusUpdated event when status changes successfully', async () => {
    await mountComponent()
    
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Status updated', task: { status: 'In Progress' } })
    )

    await wrapper.vm.updateStatus('In Progress')
    await flushPromises()

    expect(wrapper.emitted('statusUpdated')).toBeTruthy()
    expect(wrapper.emitted('statusUpdated')[0]).toEqual(['In Progress'])
  })

  it('emits error event when status update fails', async () => {
    await mountComponent()
    
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Failed to update status' }, false, 400)
    )

    await wrapper.vm.updateStatus('In Progress')
    await flushPromises()

    expect(wrapper.emitted('error')).toBeTruthy()
    expect(wrapper.emitted('error')[0][0]).toBe('Failed to update status')
  })

  it('returns correct color for each status', async () => {
    await mountComponent()
    expect(wrapper.vm.getStatusColor('To Do')).toBe('grey')
    expect(wrapper.vm.getStatusColor('In Progress')).toBe('blue')
    expect(wrapper.vm.getStatusColor('In Review')).toBe('orange')
    expect(wrapper.vm.getStatusColor('Done')).toBe('green')
    expect(wrapper.vm.getStatusColor('Blocked')).toBe('red')
  })

  it('does not update if new status is same as current', async () => {
    await mountComponent({ status: 'To Do' })
    await wrapper.vm.updateStatus('To Do')
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
