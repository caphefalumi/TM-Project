import Sprint from '../models/Sprint.js'
import Teams from '../models/Teams.js'
import Tasks from '../models/Tasks.js'

// Create a new sprint
const createSprint = async (req, res) => {
  try {
    const { teamId, name, goal, startDate, endDate } = req.body

    if (!teamId || !name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Verify team exists
    const team = await Teams.findById(teamId)
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' })
    }

    const sprint = new Sprint({
      teamId,
      name,
      goal: goal || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })

    await sprint.save()

    return res.status(201).json({
      message: 'Sprint created successfully',
      sprint,
    })
  } catch (error) {
    console.log('Error creating sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Get all sprints for a team
const getSprints = async (req, res) => {
  try {
    const { teamId } = req.params

    const sprints = await Sprint.find({ teamId }).sort({ startDate: -1 })

    return res.status(200).json({
      sprints,
      count: sprints.length,
    })
  } catch (error) {
    console.log('Error fetching sprints:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Get a specific sprint
const getSprint = async (req, res) => {
  try {
    const { sprintId } = req.params

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' })
    }

    // Get tasks in this sprint
    const tasks = await Tasks.find({ sprintId })

    return res.status(200).json({
      sprint,
      tasks,
      taskCount: tasks.length,
    })
  } catch (error) {
    console.log('Error fetching sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Update a sprint
const updateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params
    const { name, goal, startDate, endDate, status } = req.body

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' })
    }

    if (name) sprint.name = name
    if (goal !== undefined) sprint.goal = goal
    if (startDate) sprint.startDate = new Date(startDate)
    if (endDate) sprint.endDate = new Date(endDate)
    if (status) {
      sprint.status = status
      if (status === 'completed') {
        sprint.completedAt = Date.now()
      }
    }

    // Validate dates
    if (sprint.endDate <= sprint.startDate) {
      return res.status(400).json({ message: 'End date must be after start date' })
    }

    await sprint.save()

    return res.status(200).json({
      message: 'Sprint updated successfully',
      sprint,
    })
  } catch (error) {
    console.log('Error updating sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Delete a sprint
const deleteSprint = async (req, res) => {
  try {
    const { sprintId } = req.params

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' })
    }

    // Remove sprint reference from tasks
    await Tasks.updateMany({ sprintId }, { $set: { sprintId: null } })

    await Sprint.findByIdAndDelete(sprintId)

    return res.status(200).json({
      message: 'Sprint deleted successfully',
    })
  } catch (error) {
    console.log('Error deleting sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Start a sprint
const startSprint = async (req, res) => {
  try {
    const { sprintId } = req.params

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' })
    }

    if (sprint.status === 'active') {
      return res.status(400).json({ message: 'Sprint is already active' })
    }

    sprint.status = 'active'
    await sprint.save()

    return res.status(200).json({
      message: 'Sprint started successfully',
      sprint,
    })
  } catch (error) {
    console.log('Error starting sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Complete a sprint
const completeSprint = async (req, res) => {
  try {
    const { sprintId } = req.params

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' })
    }

    if (sprint.status === 'completed') {
      return res.status(400).json({ message: 'Sprint is already completed' })
    }

    sprint.status = 'completed'
    sprint.completedAt = Date.now()
    await sprint.save()

    return res.status(200).json({
      message: 'Sprint completed successfully',
      sprint,
    })
  } catch (error) {
    console.log('Error completing sprint:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export {
  createSprint,
  getSprints,
  getSprint,
  updateSprint,
  deleteSprint,
  startSprint,
  completeSprint,
}
