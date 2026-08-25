import type { Request, Response } from 'express'
import {
  AuthServiceError,
  forgotPassword as forgotPasswordService,
  googleOAuthCallback as googleOAuthCallbackService,
  localLogin as localLoginService,
  localRegister as localRegisterService,
  oAuthLookup,
  oAuthRegister,
  resendEmailVerification as resendEmailVerificationService,
  resetPassword as resetPasswordService,
  verifyResetToken,
} from './auth.service.js'

const sendServiceError = (
  res: Response,
  error: unknown,
  fallbackStatus: number,
  fallbackMessage: string,
) => {
  if (error instanceof AuthServiceError) {
    return res
      .status(error.statusCode)
      .json({ [error.responseKey]: error.message })
  }

  return res.status(fallbackStatus).json({ error: fallbackMessage })
}

export const oAuthentication = async (req: Request, res: Response) => {
  try {
    const result = await oAuthLookup(req.body.token)
    return res.status(202).json(result)
  } catch (error) {
    return sendServiceError(
      res,
      error,
      500,
      'Failed to process OAuth login. Please try again.',
    )
  }
}

export const oAuthenticationRegister = async (req: Request, res: Response) => {
  try {
    const result = await oAuthRegister(req.body.username, req.body.token)
    return res.status(201).json(result)
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to create account. Please try again.'
    return sendServiceError(res, error, 400, message)
  }
}

export const localRegister = async (req: Request, res: Response) => {
  try {
    const result = await localRegisterService(
      req.body.username,
      req.body.email,
      req.body.password,
    )
    return res.status(201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined
    return sendServiceError(res, error, 400, message)
  }
}

export const localLogin = async (req: Request, res: Response) => {
  try {
    const user = await localLoginService(req.body.username, req.body.password)
    req.body.user = user

    return res.status(200).json({
      success: 'User is authorized',
      user,
    })
  } catch (error) {
    return sendServiceError(res, error, 500, 'Internal server error')
  }
}

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await forgotPasswordService(req.body.email)
    return res.status(200).json(result)
  } catch (error) {
    return sendServiceError(
      res,
      error,
      500,
      'An error occurred while processing your request',
    )
  }
}

export const verifyToken = async (req: Request, res: Response) => {
  try {
    const result = await verifyResetToken(req.body.token)
    return res.status(200).json(result)
  } catch (error) {
    return sendServiceError(
      res,
      error,
      500,
      'An error occurred while verifying the token',
    )
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const result = await resetPasswordService(req.body.token, req.body.password)
    return res.status(200).json(result)
  } catch (error) {
    return sendServiceError(res, error, 500, 'Failed to reset password')
  }
}

export const resendEmailVerification = async (req: Request, res: Response) => {
  try {
    const result = await resendEmailVerificationService(req.body.email)
    return res.status(200).json(result)
  } catch (error) {
    return sendServiceError(res, error, 500, 'Internal server error')
  }
}

export const googleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const result = await googleOAuthCallbackService(
      req.body.code,
      req.body.codeVerifier,
    )
    return res.status(200).json(result)
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to process OAuth callback'
    return sendServiceError(res, error, 500, message)
  }
}

export default {
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
  forgotPassword,
  resetPassword,
  verifyToken,
  resendEmailVerification,
  googleOAuthCallback,
}
