import Teams from './team.model.js'
import UsersOfTeam from './team-membership.model.js'
import Tasks from '../tasks/task.model.js'
import {
  ROLES,
  getBaseRoleFromRoleType,
  getRoleLabel,
} from '../roles/role.middleware.js'

export type TeamServiceError = Error & {
  status: number
  body: Record<string, unknown>
}

const serviceError = (status: number, body: Record<string, unknown>): TeamServiceError => {
  return Object.assign(new Error(String(body.message || body.error || 'Team service error')), {
    status,
    body,
  })
}

export const isTeamServiceError = (error: unknown): error is TeamServiceError => {
  return (
    error instanceof Error &&
    typeof (error as TeamServiceError).status === 'number' &&
    typeof (error as TeamServiceError).body === 'object'
  )
}

export const getCategories = async () => {
  const categories = (Teams.schema.path('category') as any).enumValues
  if (!categories || categories.length === 0) {
    throw serviceError(404, { error: 'No categories found' })
  }
  return categories
}

export const addUserToTeam = async (
  userId: string,
  teamId: unknown,
  roleType: string = ROLES.MEMBER,
) => {
  const existingUser = await UsersOfTeam.findOne({ userId, teamId })
  if (existingUser) {
    return existingUser
  }

  const userOfTeam = new UsersOfTeam({ userId, teamId, roleType })
  return userOfTeam.save()
}

export const addTeam = async (title: string, category: string, description: string) => {
  const team = new Teams({ title, category, description })
  return team.save()
}

export const addSubTeam = async (
  title: string,
  category: string,
  description: string,
  parentTeamId: string,
) => {
  const parentTeam = await Teams.findById(parentTeamId)
  if (!parentTeam || parentTeamId === 'none') {
    return null
  }

  const subTeam = new Teams({ title, category, description, parentTeamId })
  return subTeam.save()
}

export const getParentsTeam = async (initialParentTeamId?: string | null) => {
  if (
    initialParentTeamId === 'none' ||
    initialParentTeamId === null ||
    !initialParentTeamId
  ) {
    return ''
  }

  let teamBreadCrumbs = ''
  let parentTeamId = initialParentTeamId
  let parentTeam = await Teams.findOne({ _id: parentTeamId })

  while (parentTeam) {
    teamBreadCrumbs = `${parentTeam.title} > ${teamBreadCrumbs}`
    parentTeamId = parentTeam.parentTeamId
    if (parentTeamId === 'none') {
      break
    }
    const nextParentTeam = await Teams.findOne({ _id: parentTeam.parentTeamId })
    if (!nextParentTeam) {
      break
    }
    parentTeam = nextParentTeam
  }

  return teamBreadCrumbs.trim()
}

export const createTeam = async (input: {
  title?: string
  category?: string
  description?: string
  parentTeamId?: string
  userId?: string
  username?: string
}) => {
  const { title, category, description, parentTeamId, userId, username } = input
  if (!title || !category || !description || !userId || !username) {
    throw serviceError(400, {
      message: 'Title, category, description, userId, and username are required',
    })
  }

  if (!parentTeamId) {
    await addTeam(title, category, description)
  } else {
    await addSubTeam(title, category, description, parentTeamId)
  }

  const team = await Teams.findOne({ title, category, description }).select('_id')
  if (!team) {
    throw serviceError(404, { message: 'Team not found' })
  }
  await addUserToTeam(userId, team._id, ROLES.ADMIN)

  const breadCrumbTitle = await getParentsTeam(parentTeamId)
  const responseTitle = breadCrumbTitle ? `${breadCrumbTitle} ${title}` : title

  return {
    teamId: team._id,
    title: responseTitle,
    message: 'Team created successfully',
  }
}

export const getTeamNameThatUserIsAdmin = async (userId: string) => {
  const teams = (await UsersOfTeam.find({ userId, roleType: ROLES.ADMIN })
    .populate('teamId', 'title _id parentTeamId')
    .exec()) as any[]
  const validTeams = teams.filter((team) => team.teamId !== null)

  return Promise.all(
    validTeams.map(async (team) => ({
      teamId: team.teamId._id,
      title: `${await getParentsTeam(team.teamId.parentTeamId)} ${team.teamId.title}`,
    })),
  )
}

export const getProgressBar = async (userId: string, teamId: unknown) => {
  try {
    const allTasks = await Tasks.find({ teamId, userId })
    if (allTasks.length === 0) {
      return { completedWeight: 0, totalWeight: 0, progressPercentage: 0 }
    }

    const totalWeight = allTasks.reduce((sum, task) => sum + task.weighted, 0)
    const completedWeight = allTasks.reduce(
      (sum, task) => (task.submitted ? sum + task.weighted : sum),
      0,
    )
    const progressPercentage =
      totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0

    return { completedWeight, totalWeight, progressPercentage }
  } catch (error) {
    console.log('Error calculating progress bar:', error)
    return { completedWeight: 0, totalWeight: 0, progressPercentage: 0 }
  }
}

export const getTeamThatUserIsMember = async (userId: string) => {
  if (!userId) {
    throw serviceError(400, { error: 'User ID is required' })
  }

  const teams = (await UsersOfTeam.find({ userId })
    .populate('teamId', 'title category description _id parentTeamId')
    .populate('roleId', 'color icon name')
    .exec()) as any[]
  const validTeams = teams.filter((team) => team.teamId !== null)

  return Promise.all(
    validTeams.map(async (team) => {
      const progress = await getProgressBar(userId, team.teamId._id)
      const baseRole = getBaseRoleFromRoleType(team.roleType)
      const roleLabel = getRoleLabel(team.roleType, team.roleId)
      let roleColor = 'red'

      if (team.roleId?.color) {
        roleColor = team.roleId.color
      } else if (baseRole === 'Member') {
        roleColor = 'blue'
      } else if (baseRole !== 'Admin') {
        roleColor = 'grey'
      }

      return {
        teamId: team.teamId._id,
        title: team.teamId.title,
        fullBreadCrump: `${await getParentsTeam(team.teamId.parentTeamId)} ${team.teamId.title}`,
        category: team.teamId.category,
        description: team.teamId.description,
        roleType: team.roleType,
        baseRole,
        roleLabel,
        customRole: team.roleId
          ? {
              id: team.roleId._id,
              name: team.roleId.name,
              icon: team.roleId.icon,
              color: team.roleId.color,
            }
          : null,
        roleColor,
        progress,
      }
    }),
  )
}

const getSubTeamsRecursive = async (teamId: unknown): Promise<any[]> => {
  const subTeams = await Teams.find({ parentTeamId: teamId })
  let allSubTeams: any[] = [...subTeams]

  for (const subTeam of subTeams) {
    allSubTeams = [...allSubTeams, ...(await getSubTeamsRecursive(subTeam._id))]
  }
  return allSubTeams
}

export const getAllSubTeams = async (teamId: string) => {
  return { subTeams: await getSubTeamsRecursive(teamId) }
}

const recursiveDeleteSubTeams = async (teamId: unknown) => {
  const subTeams = await Teams.find({ parentTeamId: teamId })
  if (subTeams.length === 0) {
    return
  }

  const subTeamIds = subTeams.map((subTeam) => subTeam._id)
  await Teams.deleteMany({ parentTeamId: teamId })
  await UsersOfTeam.deleteMany({ teamId: { $in: subTeamIds } })
  for (const subTeamId of subTeamIds) {
    await recursiveDeleteSubTeams(subTeamId)
  }
}

export const deleteATeam = async (teamId: string) => {
  if (!teamId) {
    throw serviceError(400, { error: 'Team ID is required' })
  }

  await recursiveDeleteSubTeams(teamId)
  const result = await Teams.deleteOne({ _id: teamId })
  if (result.deletedCount === 0) {
    throw serviceError(404, { message: 'Team not found' })
  }
  await UsersOfTeam.deleteMany({ teamId })

  return { message: 'Team and associated users deleted successfully' }
}

export const getTeamDetails = async (teamId: string) => {
  if (!teamId) {
    throw serviceError(400, { message: 'Team ID is required' })
  }

  const team = await Teams.findById(teamId)
  if (!team) {
    throw serviceError(404, { message: 'Team not found' })
  }
  return { team }
}
