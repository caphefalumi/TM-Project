import type { Request, Response } from 'express'
import * as membershipService from './team-membership.service.js'

const sendError = (res: Response, error: unknown, operation: string) => {
  if (membershipService.isTeamMembershipServiceError(error)) {
    return res.status(error.status).json(error.body)
  }
  console.log(`Error ${operation}:`, error)
  return res.status(500).json({ message: 'Internal server error' })
}

export const addUsersToTeam = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json(await membershipService.addUsersToTeam(req.body.users, req.user!))
  } catch (error) {
    return sendError(res, error, 'adding users to team')
  }
}

export const getUsersOfTeam = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await membershipService.getUsersOfTeam(req.params.teamId))
  } catch (error) {
    return sendError(res, error, 'fetching users of team')
  }
}

export const deleteUsersFromTeam = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json(await membershipService.deleteUsersFromTeam(req.params.teamId, req.body))
  } catch (error) {
    return sendError(res, error, 'deleting users from team')
  }
}

export const changeUserRole = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(
      await membershipService.changeUserRole(
        req.params.teamId,
        req.params.userId,
        req.user!.userId,
        req.body,
      ),
    )
  } catch (error) {
    return sendError(res, error, 'changing user role')
  }
}

export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json(
        await membershipService.getUserPermissions(req.params.teamId, req.params.userId, req.user!),
      )
  } catch (error) {
    return sendError(res, error, 'getting user permissions')
  }
}

export const updateUserPermissions = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(
      await membershipService.updateUserPermissions(
        req.params.teamId,
        req.params.userId,
        req.body.customPermissions,
      ),
    )
  } catch (error) {
    return sendError(res, error, 'updating user permissions')
  }
}

export default {
  addUsersToTeam,
  getUsersOfTeam,
  deleteUsersFromTeam,
  changeUserRole,
  getUserPermissions,
  updateUserPermissions,
}
