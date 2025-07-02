import connectDB from '../config/db.js'
import Tasks from '../models/Tasks.js'

async function addTask(userId, teamId, title, description, category, priority, dueDate) {
  await connectDB()
  const task = new Tasks({
    userId,
    teamId,
    title,
    description,
    category,
    priority,
    dueDate,
  })

  await task.save()
  console.log('Task created:', task)
}

const removeTaskForUser = async (taskId, userId) => {
  await connectDB()
  const result = await Tasks.deleteOne({ _id: taskId, userId })
  if (result.deletedCount > 0) {
    console.log(`Task with ID ${taskId} removed successfully`)
  } else {
    console.log(`Task with ID ${taskId} not found`)
  }
}

const removeTasksForTeam = async (teamId) => {
  // Removes all tasks for a specific team
  await connectDB()

  // Find all tasks that belong to the team
  const tasks = await Tasks.find({ teamId })

  // If no tasks found, report that
  if (tasks.length === 0) {
    console.log(`No tasks found for team ${teamId}`)
    return { deletedCount: 0, message: 'No tasks found for this team' }
  }

  // Delete all tasks for the team
  const result = await Tasks.deleteMany({ teamId })

  console.log(`${result.deletedCount} tasks removed for team ${teamId}`)
  return {
    deletedCount: result.deletedCount,
    message: `${result.deletedCount} tasks removed successfully`,
  }
}

const removeTaskByTitleForTeam = async (taskTitle, teamId) => {
  // Removes a specific task for a team
  await connectDB()
  const result = await Tasks.deleteMany({ title: taskTitle, teamId });
  console.log(`${result.deletedCount} instances of task "${taskTitle}" removed from team ${teamId}`);
  return result;
}

// Add Task Example
// addTask('12345', '67890', 'Test Task', 'This is a test task description.', 'development', 'high', new Date('2023-12-31'))

// Wrong Example
// addTask('12345', '67890', 'Test Task', 'This is a test task description.', 'developments', 'high', new Date('2023-12-31'))
// addTask('12345', '67890', 'Test Task', 'This is a test task description.', 'development', 'higher', new Date('2023-12-31'))

// Real Example
// addTask('684e69d04b8cfb8924086091', '685c0d22b9ee795308ac5d5a', 'Build Task Schema', 'CRUD for Task Schema', 'development', 'high', new Date('2025-12-31'))
