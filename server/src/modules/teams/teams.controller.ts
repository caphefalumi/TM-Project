import type { Request, Response } from 'express'
import * as teamsService from './teams.service.js'

const sendError = (
  res: Response,
  error: unknown,
  operation: string,
  fallbackBody: Record<string, string>,
) => {
  if (teamsService.isTeamServiceError(error)) {
    return res.status(error.status).json(error.body)
  }
  console.log(`Error ${operation}:`, error)
  return res.status(500).json(fallbackBody)
}

export const createTeam = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await teamsService.createTeam(req.body))
  } catch (error) {
    return sendError(res, error, 'adding team', { message: 'Internal server error' })
  }
}

export const addTeamPro = createTeam

export const getTeamDetails = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await teamsService.getTeamDetails(req.params.teamId))
  } catch (error) {
    return sendError(res, error, 'fetching team details', {
      message: 'Internal server error',
    })
  }
}

export const getCategories = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json(await teamsService.getCategories())
  } catch (error) {
    return sendError(res, error, 'fetching categories', { error: 'Internal server error' })
  }
}

export const deleteATeam = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await teamsService.deleteATeam(req.params.teamId))
  } catch (error) {
    return sendError(res, error, 'deleting team', { message: 'Internal server error' })
  }
}

export const getTeamNameThatUserIsAdmin = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json(await teamsService.getTeamNameThatUserIsAdmin(req.user!.userId))
  } catch (error) {
    return sendError(res, error, 'fetching teams for user', {
      error: 'Internal server error',
    })
  }
}

export const getTeamThatUserIsMember = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await teamsService.getTeamThatUserIsMember(req.user!.userId))
  } catch (error) {
    return sendError(res, error, 'fetching teams for user', {
      error: 'Internal server error',
    })
  }
}

export const getAllSubTeams = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await teamsService.getAllSubTeams(req.params.teamId))
  } catch (error) {
    return sendError(res, error, 'fetching sub-teams', { error: 'Internal server error' })
  }
}

export default {
  createTeam,
  addTeamPro,
  getTeamDetails,
  getCategories,
  deleteATeam,
  getTeamNameThatUserIsAdmin,
  getTeamThatUserIsMember,
  getAllSubTeams,
}
