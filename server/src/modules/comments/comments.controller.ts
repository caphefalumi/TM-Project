import * as commentsService from './comments.service.js'

const sendResult = async (res: any, operation: Promise<commentsService.CommentServiceResult>) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const addComment = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      commentsService.addComment(req.params.taskId, req.body.comment, req.user),
    )
  } catch (error) {
    console.log('Error adding comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getComments = async (req: any, res: any) => {
  try {
    return await sendResult(res, commentsService.getComments(req.params.taskId))
  } catch (error) {
    console.log('Error fetching comments:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateComment = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      commentsService.updateComment(req.params.commentId, req.body.comment, req.user.userId),
    )
  } catch (error) {
    console.log('Error updating comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteComment = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      commentsService.deleteComment(req.params.commentId, req.user.userId),
    )
  } catch (error) {
    console.log('Error deleting comment:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  addComment,
  getComments,
  updateComment,
  deleteComment,
}
