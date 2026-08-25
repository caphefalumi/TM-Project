import * as sprintService from './sprint.service.js'

const sendResult = async (res: any, operation: Promise<sprintService.SprintServiceResult>) => {
  const { status, body } = await operation
  return res.status(status).json(body)
}

export const createSprint = async (req: any, res: any) => {
  try {
    return await sendResult(res, sprintService.createSprint(req.body))
  } catch (error) {
    console.log('Error creating sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getSprints = async (req: any, res: any) => {
  try {
    return await sendResult(res, sprintService.getSprints(req.params.teamId))
  } catch (error) {
    console.log('Error fetching sprints:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getSprint = async (req: any, res: any) => {
  try {
    return await sendResult(res, sprintService.getSprint(req.params.sprintId))
  } catch (error) {
    console.log('Error fetching sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateSprint = async (req: any, res: any) => {
  try {
    return await sendResult(
      res,
      sprintService.updateSprint(req.params.sprintId, req.body),
    )
  } catch (error) {
    console.log('Error updating sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteSprint = async (req: any, res: any) => {
  try {
    return await sendResult(res, sprintService.deleteSprint(req.params.sprintId))
  } catch (error) {
    console.log('Error deleting sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const startSprint = async (req: any, res: any) => {
  try {
    return await sendResult(res, sprintService.startSprint(req.params.sprintId))
  } catch (error) {
    console.log('Error starting sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const completeSprint = async (req: any, res: any) => {
  try {
    return await sendResult(res, sprintService.completeSprint(req.params.sprintId))
  } catch (error) {
    console.log('Error completing sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
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
