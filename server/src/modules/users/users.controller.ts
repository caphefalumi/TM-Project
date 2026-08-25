import type { Request, Response } from 'express'
import type { TokenCookies } from './users.service.js'
import * as usersService from './users.service.js'

const setAuthCookies = (res: Response, tokens: TokenCookies | null) => {
  if (!tokens) {
    return
  }

  const sameSite = process.env.NODE_ENV === 'production' ? 'lax' : 'none'
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite,
    maxAge: Number(process.env.REFRESH_TOKEN_TIME),
    path: '/',
  })
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite,
    maxAge: Number(process.env.ACCESS_TOKEN_TIME),
    path: '/',
  })
}

const sendError = (res: Response, error: unknown, operation: string) => {
  if (usersService.isUsersServiceError(error)) {
    return res.status(error.status).json(error.body)
  }
  console.log(`Error ${operation}:`, error)
  return res.status(500).json({ error: 'Internal server error' })
}

export const getAuthenticatedUser = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await usersService.getAuthenticatedUser(req.user!.userId))
  } catch (error) {
    return sendError(res, error, 'retrieving authenticated user')
  }
}

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json(await usersService.getAllUsers())
  } catch (error) {
    return sendError(res, error, 'fetching users')
  }
}

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const result = await usersService.updateUserProfile(req.user!.userId, req.body)
    setAuthCookies(res, result.tokens)
    return res.status(200).json(result.body)
  } catch (error) {
    return sendError(res, error, 'updating profile')
  }
}

export const verifyEmailChange = async (req: Request, res: Response) => {
  try {
    const result = await usersService.verifyEmailChange(req.body.token)
    setAuthCookies(res, result.tokens)
    return res.status(200).json(result.body)
  } catch (error) {
    return sendError(res, error, 'verifying email change')
  }
}

export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await usersService.deleteUserAccount(req.user!.userId))
  } catch (error) {
    return sendError(res, error, 'deleting account')
  }
}

export default {
  getAuthenticatedUser,
  getAllUsers,
  updateUserProfile,
  verifyEmailChange,
  deleteUserAccount,
}
