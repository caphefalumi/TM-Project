/**
 * TaskTimeTracking Component Tests
 * Tests time tracking functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskTimeTracking from '../src/components/TaskTimeTracking.vue'
import { setupFetchMock, mockFetchResponse, flushPromises } from './helpers.js'

describe('TaskTimeTracking Component', () => {
  let wrapper
  let fetchMock

  const defaultProps = {
    taskId: 'task-123',
    estimatedHours: 10,
    loggedHours: 5,
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
    wrapper = mount(TaskTimeTracking, {
      props: {
        ...defaultProps,
        ...propsOverride,
      },
      global: {
        stubs: {
          'v-card': false,
          'v-card-title': false,
          'v-card-text': false,
          'v-text-field': false,
          'v-btn': false,
          'v-row': false,
          'v-col': false,
          'v-progress-linear': false,
          'v-divider': false,
          'v-icon': false,
        },
      },
    })
    await wrapper.vm.$nextTick()
  }

  it('renders component', async () => {
    await mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('calculates progress percentage correctly', async () => {
    await mountComponent({ estimatedHours: 10, loggedHours: 5 })
    expect(wrapper.vm.progressPercentage).toBe(50)
  })

  it('calculates progress percentage as 0 when no estimate', async () => {
    await mountComponent({ estimatedHours: 0, loggedHours: 5 })
    expect(wrapper.vm.progressPercentage).toBe(0)
  })

  it('caps progress percentage at 100', async () => {
    await mountComponent({ estimatedHours: 10, loggedHours: 15 })
    expect(wrapper.vm.progressPercentage).toBe(100)
  })

  it('returns correct progress color', async () => {
    await mountComponent({ estimatedHours: 10, loggedHours: 4 })
    expect(wrapper.vm.progressColor).toBe('green')

    await wrapper.setProps({ loggedHours: 6 })
    expect(wrapper.vm.progressColor).toBe('blue')

    await wrapper.setProps({ loggedHours: 9 })
    expect(wrapper.vm.progressColor).toBe('orange')

    await wrapper.setProps({ loggedHours: 11 })
    expect(wrapper.vm.progressColor).toBe('red')
  })

  it('calculates remaining hours correctly', async () => {
    await mountComponent({ estimatedHours: 10, loggedHours: 3 })
    expect(wrapper.vm.remainingHours).toBe('7.0')
  })

  it('shows 0 remaining when logged exceeds estimate', async () => {
    await mountComponent({ estimatedHours: 10, loggedHours: 12 })
    expect(wrapper.vm.remainingHours).toBe('0.0')
  })

  it('logs time successfully', async () => {
    await mountComponent()
    
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Time logged', task: { loggedHours: 7 } })
    )

    wrapper.vm.hoursToLog = 2
    await wrapper.vm.logTime()
    await flushPromises()

    expect(wrapper.emitted('timeLogged')).toBeTruthy()
    expect(wrapper.emitted('timeLogged')[0]).toEqual([2])
    expect(wrapper.vm.hoursToLog).toBeNull()
  })

  it('does not log time with invalid hours', async () => {
    await mountComponent()
    wrapper.vm.hoursToLog = 0
    await wrapper.vm.logTime()
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('emits error when time logging fails', async () => {
    await mountComponent()
    
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Failed to log time' }, false, 400)
    )

    wrapper.vm.hoursToLog = 2
    await wrapper.vm.logTime()
    await flushPromises()

    expect(wrapper.emitted('error')).toBeTruthy()
  })

  it('updates estimate successfully', async () => {
    await mountComponent()
    
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Estimate updated', task: { estimatedHours: 15 } })
    )

    wrapper.vm.localEstimate = 15
    await wrapper.vm.updateEstimate()
    await flushPromises()

    expect(wrapper.emitted('estimateUpdated')).toBeTruthy()
    expect(wrapper.emitted('estimateUpdated')[0]).toEqual([15])
  })

  it('does not update estimate if value unchanged', async () => {
    await mountComponent({ estimatedHours: 10 })
    wrapper.vm.localEstimate = 10
    await wrapper.vm.updateEstimate()
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('emits error when estimate update fails', async () => {
    await mountComponent()
    
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Failed to update estimate' }, false, 400)
    )

    wrapper.vm.localEstimate = 15
    await wrapper.vm.updateEstimate()
    await flushPromises()

    expect(wrapper.emitted('error')).toBeTruthy()
    expect(wrapper.vm.localEstimate).toBe(defaultProps.estimatedHours) // Reverted
  })
})
