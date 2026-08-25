import Teams from '../teams/team.model.js'
import Tasks from '../tasks/task.model.js'
import Sprint from './sprint.model.js'

export type SprintServiceResult = {
  status: number
  body: Record<string, unknown>
}

const result = (status: number, body: Record<string, unknown>): SprintServiceResult => ({
  status,
  body,
})

export const createSprint = async (body: any): Promise<SprintServiceResult> => {
  const { teamId, name, goal, startDate, endDate } = body
  if (!teamId || !name || !startDate || !endDate) {
    return result(400, { message: 'Missing required fields' })
  }

  const team = await Teams.findById(teamId)
  if (!team) {
    return result(404, { message: 'Team not found' })
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return result(400, { message: 'End date must be after start date' })
  }

  const sprint = new Sprint({
    teamId,
    name,
    goal: goal || '',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })
  await sprint.save()
  return result(201, { message: 'Sprint created successfully', sprint })
}

export const getSprints = async (teamId: string): Promise<SprintServiceResult> => {
  const sprints = await Sprint.find({ teamId }).sort({ startDate: -1 })
  return result(200, { sprints, count: sprints.length })
}

export const getSprint = async (sprintId: string): Promise<SprintServiceResult> => {
  const sprint = await Sprint.findById(sprintId)
  if (!sprint) {
    return result(404, { message: 'Sprint not found' })
  }

  const tasks = await Tasks.find({ sprintId })
  return result(200, { sprint, tasks, taskCount: tasks.length })
}

export const updateSprint = async (
  sprintId: string,
  body: any,
): Promise<SprintServiceResult> => {
  const { name, goal, startDate, endDate, status } = body
  const sprint = await Sprint.findById(sprintId)
  if (!sprint) {
    return result(404, { message: 'Sprint not found' })
  }

  if (name) sprint.name = name
  if (goal !== undefined) sprint.goal = goal
  if (startDate) sprint.startDate = new Date(startDate)
  if (endDate) sprint.endDate = new Date(endDate)
  if (status) {
    sprint.status = status
    if (status === 'completed') {
      sprint.completedAt = new Date()
    }
  }

  if (sprint.endDate <= sprint.startDate) {
    return result(400, { message: 'End date must be after start date' })
  }

  await sprint.save()
  return result(200, { message: 'Sprint updated successfully', sprint })
}

export const deleteSprint = async (sprintId: string): Promise<SprintServiceResult> => {
  const sprint = await Sprint.findById(sprintId)
  if (!sprint) {
    return result(404, { message: 'Sprint not found' })
  }

  await Tasks.updateMany({ sprintId }, { $set: { sprintId: null } })
  await Sprint.findByIdAndDelete(sprintId)
  return result(200, { message: 'Sprint deleted successfully' })
}

export const startSprint = async (sprintId: string): Promise<SprintServiceResult> => {
  const sprint = await Sprint.findById(sprintId)
  if (!sprint) {
    return result(404, { message: 'Sprint not found' })
  }
  if (sprint.status === 'active') {
    return result(400, { message: 'Sprint is already active' })
  }

  sprint.status = 'active'
  await sprint.save()
  return result(200, { message: 'Sprint started successfully', sprint })
}

export const completeSprint = async (sprintId: string): Promise<SprintServiceResult> => {
  const sprint = await Sprint.findById(sprintId)
  if (!sprint) {
    return result(404, { message: 'Sprint not found' })
  }
  if (sprint.status === 'completed') {
    return result(400, { message: 'Sprint is already completed' })
  }

  sprint.status = 'completed'
  sprint.completedAt = new Date()
  await sprint.save()
  return result(200, { message: 'Sprint completed successfully', sprint })
}

export default {
  createSprint,
  getSprints,
  getSprint,
  updateSprint,
  deleteSprint,
  startSprint,
  completeSprint,
}
