import connectDB from '../config/db.js'
import UsersOfTeam from '../models/UsersOfTeam.js'

const addUserToTeam = async (userId, username, teamId, role) => {
    await connectDB()
    const userOfTeam = new UsersOfTeam({
        userId,
        username,
        teamId,
        role
    })
    await userOfTeam.save()
    console.log('User added to team:', userOfTeam)
}

const promoteUserToAdmin = async (userId, teamId) => {
    await connectDB()
    const result = await UsersOfTeam.updateOne(
        { userId, teamId },
        { $set: { role: 'admin' } }
    )
    if (result.modifiedCount > 0) {
        console.log(`User with ID ${userId} promoted to admin in team with ID ${teamId}`)
    } else {
        console.log(`User with ID ${userId} not found in team with ID ${teamId} or already an admin`)
    }
}

const removeUserFromTeam = async (userId, teamId) => {
    await connectDB()
    const result = await UsersOfTeam.deleteOne({ userId, teamId })
    if (result.deletedCount > 0) {
        console.log(`User with ID ${userId} removed from team with ID ${teamId}`)
    } else {
        console.log(`User with ID ${userId} not found in team with ID ${teamId}`)
    }
}

// Example:
// addUserToTeam('user123', 'john_doe', 'team456', 'member')
// promoteUserToAdmin('user123', 'team456')
// removeUserFromTeam('user123', 'team456')



// nodemon "src\server\scripts\teamsusersInteraction.js"