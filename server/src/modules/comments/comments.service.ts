import Tasks from '../tasks/task.model.js'
import { logTaskActivity } from '../tasks/task-activity.service.js'
import TaskComments from './task-comment.model.js'

export type CommentServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): CommentServiceResult => ({
  status,
  body,
})

export const addComment = async (
  taskId: string,
  comment: string,
  user: any,
): Promise<CommentServiceResult> => {
  if (!comment || comment.trim() === '') {
    return result(400, { message: 'Comment cannot be empty' })
  }

  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const newComment = new TaskComments({
    taskId,
    userId: user.userId,
    username: user.username,
    comment: comment.trim(),
  })
  await newComment.save()

  await logTaskActivity({
    taskId,
    userId: user.userId,
    username: user.username,
    action: 'comment_added',
    details: { description: 'Added a comment' },
  })

  return result(201, { message: 'Comment added successfully', comment: newComment })
}

export const getComments = async (taskId: string): Promise<CommentServiceResult> => {
  const task = await Tasks.findById(taskId)
  if (!task) {
    return result(404, { message: 'Task not found' })
  }

  const comments = await TaskComments.find({ taskId }).sort({ createdAt: -1 })
  return result(200, { comments, count: comments.length })
}

export const updateComment = async (
  commentId: string,
  comment: string,
  userId: string,
): Promise<CommentServiceResult> => {
  if (!comment || comment.trim() === '') {
    return result(400, { message: 'Comment cannot be empty' })
  }

  const existingComment = await TaskComments.findById(commentId)
  if (!existingComment) {
    return result(404, { message: 'Comment not found' })
  }
  if (existingComment.userId !== userId) {
    return result(403, { message: 'Not authorized to update this comment' })
  }

  existingComment.comment = comment.trim()
  existingComment.updatedAt = new Date()
  existingComment.edited = true
  await existingComment.save()

  return result(200, { message: 'Comment updated successfully', comment: existingComment })
}

export const deleteComment = async (
  commentId: string,
  userId: string,
): Promise<CommentServiceResult> => {
  const comment = await TaskComments.findById(commentId)
  if (!comment) {
    return result(404, { message: 'Comment not found' })
  }
  if (comment.userId !== userId) {
    return result(403, { message: 'Not authorized to delete this comment' })
  }

  await TaskComments.findByIdAndDelete(commentId)
  return result(200, { message: 'Comment deleted successfully' })
}

export default {
  addComment,
  getComments,
  updateComment,
  deleteComment,
}
