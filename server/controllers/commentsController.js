import TaskComments from '../models/TaskComments.js'
import Tasks from '../models/Tasks.js'
import TaskActivity from '../models/TaskActivity.js'

// Add a comment to a task
const addComment = async (req, res) => {
  try {
    const { taskId } = req.params
    const { comment } = req.body
    const userId = req.user.userId
    const username = req.user.username

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment cannot be empty' })
    }

    // Verify task exists
    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const newComment = new TaskComments({
      taskId,
      userId,
      username,
      comment: comment.trim(),
    })

    await newComment.save()

    // Log activity
    const activity = new TaskActivity({
      taskId,
      userId,
      username,
      action: 'comment_added',
      description: `Added a comment`,
    })
    await activity.save()

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment,
    })
  } catch (error) {
    console.log('Error adding comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Get all comments for a task
const getComments = async (req, res) => {
  try {
    const { taskId } = req.params

    // Verify task exists
    const task = await Tasks.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const comments = await TaskComments.find({ taskId }).sort({ createdAt: -1 })

    return res.status(200).json({
      comments,
      count: comments.length,
    })
  } catch (error) {
    console.log('Error fetching comments:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Update a comment
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params
    const { comment } = req.body
    const userId = req.user.userId

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment cannot be empty' })
    }

    const existingComment = await TaskComments.findById(commentId)
    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    // Only the comment author can update it
    if (existingComment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this comment' })
    }

    existingComment.comment = comment.trim()
    existingComment.updatedAt = Date.now()
    existingComment.edited = true

    await existingComment.save()

    return res.status(200).json({
      message: 'Comment updated successfully',
      comment: existingComment,
    })
  } catch (error) {
    console.log('Error updating comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.userId

    const comment = await TaskComments.findById(commentId)
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    // Only the comment author can delete it
    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' })
    }

    await TaskComments.findByIdAndDelete(commentId)

    return res.status(200).json({
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    console.log('Error deleting comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export { addComment, getComments, updateComment, deleteComment }
