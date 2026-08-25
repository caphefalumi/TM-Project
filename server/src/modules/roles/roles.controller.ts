import type { Request, Response } from 'express'
import * as rolesService from './roles.service.js'

const sendError = (res: Response, error: unknown, operation: string) => {
  if (rolesService.isRoleServiceError(error)) {
    return res.status(error.status).json(error.body)
  }
  console.log(`Error ${operation} role:`, error)
  return res.status(500).json({ message: 'Internal server error' })
}

export const createRole = async (req: Request, res: Response) => {
  try {
    return res.status(201).json(await rolesService.createRole(req.params.teamId, req.body))
  } catch (error) {
    return sendError(res, error, 'creating')
  }
}

export const getRolesByTeam = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await rolesService.getRolesByTeam(req.params.teamId))
  } catch (error) {
    return sendError(res, error, 'getting')
  }
}

export const getRoleById = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await rolesService.getRoleById(req.params.roleId))
  } catch (error) {
    return sendError(res, error, 'getting')
  }
}

export const updateRole = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await rolesService.updateRole(req.params.roleId, req.body))
  } catch (error) {
    return sendError(res, error, 'updating')
  }
}

export const deleteRole = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await rolesService.deleteRole(req.params.roleId))
  } catch (error) {
    return sendError(res, error, 'deleting')
  }
}

export const assignCustomRoleToUser = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(
      await rolesService.assignCustomRoleToUser(
        req.params.teamId,
        req.params.userId,
        req.user!.userId,
        req.body,
      ),
    )
  } catch (error) {
    return sendError(res, error, 'assigning custom')
  }
}

export default {
  createRole,
  getRolesByTeam,
  getRoleById,
  updateRole,
  deleteRole,
  assignCustomRoleToUser,
}
