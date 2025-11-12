/**
 * TaskComments Component Tests
 * Tests task comments functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskComments from '../src/components/TaskComments.vue'
import { setupFetchMock, mockFetchResponse, flushPromises } from './helpers.js'

describe('TaskComments Component', () => {
  let wrapper
  let fetchMock

  const defaultProps = {
    taskId: 'task-123',
    userId: 'user-456',
  }

  const mockComments = [
    {
      _id: 'comment-1',
      taskId: 'task-123',
      userId: 'user-456',
      username: 'testuser',
      comment: 'This is a test comment',
      createdAt: new Date().toISOString(),
      edited: false,
    },
    {
      _id: 'comment-2',
      taskId: 'task-123',
      userId: 'user-789',
      username: 'anotheruser',
      comment: 'Another comment',
      createdAt: new Date().toISOString(),
      edited: false,
    },
  ]

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
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ comments: mockComments, count: mockComments.length })
    )

    wrapper = mount(TaskComments, {
      props: {
        ...defaultProps,
        ...propsOverride,
      },
      global: {
        stubs: {
          'v-card': false,
          'v-card-title': false,
          'v-card-text': false,
          'v-textarea': false,
          'v-btn': false,
          'v-list': false,
          'v-list-item': false,
          'v-list-item-title': false,
          'v-list-item-subtitle': false,
          'v-avatar': false,
          'v-icon': false,
          'v-divider': false,
        },
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()
  }

  it('renders component', async () => {
    await mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('fetches and displays comments on mount', async () => {
    await mountComponent()
    expect(wrapper.vm.comments).toHaveLength(2)
    expect(wrapper.vm.comments[0].comment).toBe('This is a test comment')
  })

  it('adds a new comment successfully', async () => {
    await mountComponent()

    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Comment added', comment: mockComments[0] })
    )

    // Mock second fetch for refreshing comments
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ comments: mockComments, count: mockComments.length })
    )

    wrapper.vm.newComment = 'New test comment'
    await wrapper.vm.addComment()
    await flushPromises()

    expect(wrapper.emitted('commentAdded')).toBeTruthy()
  })

  it('does not add empty comment', async () => {
    await mountComponent()

    wrapper.vm.newComment = '   '
    await wrapper.vm.addComment()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1) // Only initial fetch
  })

  it('emits error when comment addition fails', async () => {
    await mountComponent()

    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Failed to add comment' }, false, 400)
    )

    wrapper.vm.newComment = 'Test comment'
    await wrapper.vm.addComment()
    await flushPromises()

    expect(wrapper.emitted('error')).toBeTruthy()
  })

  it('allows editing own comments', async () => {
    await mountComponent()

    const ownComment = mockComments[0]
    wrapper.vm.startEdit(ownComment)

    expect(wrapper.vm.editingCommentId).toBe(ownComment._id)
    expect(wrapper.vm.editedCommentText).toBe(ownComment.comment)
  })

  it('updates comment successfully', async () => {
    await mountComponent()

    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Comment updated', comment: mockComments[0] })
    )

    // Mock second fetch for refreshing comments
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ comments: mockComments, count: mockComments.length })
    )

    wrapper.vm.editingCommentId = 'comment-1'
    wrapper.vm.editedCommentText = 'Updated comment'
    await wrapper.vm.saveEdit('comment-1')
    await flushPromises()

    expect(wrapper.vm.editingCommentId).toBeNull()
  })

  it('deletes comment after confirmation', async () => {
    await mountComponent()

    // Mock window.confirm
    global.confirm = vi.fn(() => true)

    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ message: 'Comment deleted' })
    )

    // Mock second fetch for refreshing comments
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ comments: mockComments, count: mockComments.length })
    )

    await wrapper.vm.deleteComment('comment-1')
    await flushPromises()

    expect(global.confirm).toHaveBeenCalled()
  })

  it('does not delete comment without confirmation', async () => {
    await mountComponent()

    // Mock window.confirm to return false
    global.confirm = vi.fn(() => false)

    await wrapper.vm.deleteComment('comment-1')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1) // Only initial fetch
  })
})
