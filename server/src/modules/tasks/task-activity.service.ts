import TaskActivity from './task-activity.model.js'

type TaskActivityInput = {
  taskId: unknown
  userId: unknown
  action: string
  details?: Record<string, unknown>
  [key: string]: unknown
}

export const logTaskActivity = async ({
  taskId,
  userId,
  action,
  details = {},
  ...activityData
}: TaskActivityInput) => {
  const activity = new TaskActivity({
    taskId,
    userId,
    action,
    ...activityData,
    ...details,
  })

  return activity.save()
}

export default {
  logTaskActivity,
}
