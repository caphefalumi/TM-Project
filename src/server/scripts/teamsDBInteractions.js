import connectDB from '../config/db.js'
import Teams from '../models/Teams.js'

// test purposes only


async function addTeam(title, category, description){
    await connectDB()
    const team = new Teams({
        title,
        category,
        description
    })

    await team.save()
    console.log('Team created:', team)
}

async function addSubTeam(title, category, description, parentTeamId) {
    await connectDB()
    // check for parentTeamId validity
    const parentTeam = await Teams.findById(parentTeamId)
    if (!parentTeam) {
        console.error('Parent team not found:', parentTeamId)
        return
    } else if(parentTeamId === 'none') {
        console.error('Sub-team cannot have "none" as parentTeamId')
        return
    } else{
        const subTeam = new Teams({
            title,
            category,
            description,
            parentTeamId
        })
        await subTeam.save()
        console.log('Sub-team created:', subTeam)
    }
}

async function getParentsTeam(parentTeamId){
    if(parentTeamId === 'none') {
        console.log('This team has no parent team.')
        return null;
    } else {
        await connectDB()
        let teamBreadCrumps = "";
        let parentTeam = await Teams.findOne({ _id: parentTeamId })
        while(parentTeam) {
            teamBreadCrumps = parentTeam.title + " > " + teamBreadCrumps;
            parentTeamId = parentTeam.parentTeamId;
            if(parentTeamId === 'none') {
                break;
            }
            const nextParentTeam = await Teams.findOne({ _id: parentTeam.parentTeamId });
            if (!nextParentTeam) {
                break;
            }
            parentTeam = nextParentTeam;
        }
        console.log('Team Bread Crumps:', teamBreadCrumps.trim());
        return teamBreadCrumps.trim();
    }
}

export default {
    addTeam,
    addSubTeam,
    getParentsTeam
}
// addTeam('Test Team', 'Development', 'This is a test team for development purposes')
// addSubTeam('Test Sub-Team', 'Development', 'This is a test sub-team for development purposes', '685bfeb96598a857a3c93102')
// addSubTeam('Test Sub-Team 2', 'UI / UX', 'This is a test sub-team for UI / UX purposes', '685c0070bc39268e2c142aef')
// getParentsTeam('685c0070bc39268e2c142aef')
// addSubTeam('Test Sub-Team 2', 'Development', 'This is a test sub-team for development purposes', 'none')
// addSubTeam('Test Sub-Team 2', 'Development', 'This is a test sub-team for development purposes', 'hello world!')
// nodemon "src\server\scripts\teamsDBInteractions.js"