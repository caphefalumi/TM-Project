import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import dotenv from 'dotenv'
import Account from './account.model.js'
import Mailer from '../../shared/services/mailer.service.js'
import RefreshTokenManager from './session.service.js'
import Teams from '../teams/team.model.js'
import UsersOfTeam from '../teams/team-membership.model.js'
import Tasks from '../tasks/task.model.js'
import { ROLES } from '../roles/role.middleware.js'

dotenv.config({ quiet: true })

const EMAIL_VERIFICATION_EXPIRATION = 24 * 60 * 60 * 1000

export class AuthServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly responseKey: 'error' | 'message' = 'error',
  ) {
    super(message)
    this.name = 'AuthServiceError'
  }
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const getGoogleUser = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const googleUser = await response.json()

  if (!response.ok || !googleUser.email) {
    console.log('OAuth userinfo lookup failed:', googleUser)
    throw new AuthServiceError(
      401,
      'Failed to verify Google account. Please try again.',
    )
  }

  return googleUser
}

export const oAuthLookup = async (googleAccessToken: string) => {
  if (!googleAccessToken) {
    throw new AuthServiceError(400, 'No access token provided', 'message')
  }

  try {
    const googleUser = await getGoogleUser(googleAccessToken)
    const email = googleUser.email.toLowerCase()
    const existingUser = await Account.findOne({ email })

    if (!existingUser) {
      console.log('OAuth registration for new user with email:', email)
      return { success: 'register' }
    }

    console.log('OAuth login for existing user:', existingUser.username)
    return {
      success: 'login',
      username: existingUser.username,
      userId: existingUser._id.toString(),
      email: existingUser.email,
    }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }
    console.log('OAuth authentication error:', error)
    throw new AuthServiceError(500, 'Failed to process OAuth login. Please try again.')
  }
}

export const createSampleTeamAndTasks = async (account) => {
  try {
    const team = new Teams({
      title: `${account.username}'s Sample Team`,
      category: 'Development',
      description: 'This is your first sample team. You can edit or delete it.',
    })
    await team.save()

    const existingMembership = await UsersOfTeam.findOne({
      userId: account._id,
      teamId: team._id,
    })
    if (!existingMembership) {
      const membership = new UsersOfTeam({
        userId: account._id,
        teamId: team._id,
        roleType: ROLES.ADMIN,
      })
      await membership.save()
    }

    const now = new Date()
    const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const userId = account._id.toString()
    const teamId = team._id.toString()

    const sampleTasks = [
      new Tasks({
        userId,
        teamId,
        taskGroupId: 'sample-group',
        design: {
          numberOfFields: 1,
          fields: [{ label: 'Description', type: 'Short text', config: { required: true } }],
        },
        title: 'Welcome Task',
        category: 'Development',
        tags: ['welcome'],
        description: 'Complete this task to get started!',
        priority: 'Medium',
        weighted: 1,
        startDate: now,
        dueDate: due,
      }),
      new Tasks({
        userId,
        teamId,
        taskGroupId: 'sample-group-2',
        design: {
          numberOfFields: 1,
          fields: [{ label: 'Checklist', type: 'Short text', config: { required: false } }],
        },
        title: 'Try Editing a Task',
        category: 'Development',
        tags: ['edit'],
        description: 'Edit this task to see how it works.',
        priority: 'Low',
        weighted: 1,
        startDate: now,
        dueDate: due,
      }),
    ]

    await Tasks.insertMany(sampleTasks)
  } catch (error) {
    console.log('Error creating sample team and tasks:', error)
    throw error
  }
}

export const oAuthRegister = async (username: string, token: string) => {
  if (!username) {
    throw new AuthServiceError(400, 'Username is required')
  }
  if (!token) {
    throw new AuthServiceError(400, 'No access token provided', 'message')
  }

  try {
    const googleUser = await getGoogleUser(token)
    const email = googleUser.email.toLowerCase()
    console.log('REGISTER EMAIL: ', email)

    const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
    if (existingUser?.username === username) {
      throw new AuthServiceError(402, 'Username already exists.')
    }
    if (existingUser?.email === email) {
      throw new AuthServiceError(403, 'Email already exists.')
    }

    const account = new Account({
      username,
      email,
      provider: 'google',
      emailVerified: true,
    })
    await account.save()
    await createSampleTeamAndTasks(account)

    return {
      success: 'Account created successfully. Sample team and tasks created.',
      userId: account._id.toString(),
      username: account.username,
      email: account.email,
    }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }
    console.log('OAuth registration error:', error)
    throw new AuthServiceError(
      400,
      errorMessage(error, 'Failed to create account. Please try again.'),
    )
  }
}

export const localRegister = async (username: string, email: string, password: string) => {
  if (!username || !email || !password) {
    throw new AuthServiceError(400, 'All fields are required.')
  }
  if (password.length < 6) {
    throw new AuthServiceError(400, 'Password must be at least 6 characters.')
  }

  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  if (existingUser?.username === username) {
    throw new AuthServiceError(400, 'Username already exists.')
  }
  if (existingUser?.email === email) {
    throw new AuthServiceError(400, 'Email already exists.')
  }

  try {
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex')
    const account = new Account({
      username,
      email,
      password,
      provider: 'local',
      emailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION),
    })
    await account.save()
    await createSampleTeamAndTasks(account)
    await Mailer.sendVerificationEmail(email, verificationToken)

    console.log('Created account and sample team/tasks for user:', username)
    return { success: 'Account created. Please verify your email to activate your account.' }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }
    throw new AuthServiceError(400, errorMessage(error, ''))
  }
}

export const localLogin = async (username: string, password: string) => {
  if (!username || !password) {
    console.log('Missing fields:', { username, password })
    throw new AuthServiceError(400, 'All fields are required.')
  }

  const account = await Account.findOne({ username })
  if (!account) {
    console.log('No Account')
    throw new AuthServiceError(400, 'Invalid username or password')
  }

  const isMatch = await bcrypt.compare(password, account.password)
  if (!isMatch) {
    console.log('Password mismatch')
    throw new AuthServiceError(400, 'Invalid username or password')
  }

  const suspiciousActivity = await RefreshTokenManager.checkSuspiciousActivity(account._id)
  if (suspiciousActivity.isSuspicious) {
    console.log(
      `Suspicious activity detected for user ${account._id}: ${suspiciousActivity.recentUniqueIPs} different IPs in last 24 hours`,
    )
    await RefreshTokenManager.revokeAllUserTokens(account._id, 'suspicious_activity')
  }

  if (account.emailVerified === false) {
    throw new AuthServiceError(
      403,
      'Email not verified. Please verify your email before logging in.',
    )
  }

  return {
    userId: account._id,
    username: account.username,
    email: account.email,
  }
}

export const forgotPassword = async (email: string) => {
  try {
    if (!email) {
      throw new AuthServiceError(400, 'Email is required')
    }

    const normalizedEmail = email.toLowerCase()
    const account = await Account.findOne({ email: normalizedEmail })
    if (!account) {
      throw new AuthServiceError(404, 'No account found with that email address')
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    account.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    account.passwordResetExpires = Date.now() + 900000
    await account.save()

    try {
      await Mailer.sendResetPasswordEmail(account.email, resetToken)
      return {
        message: 'If an account with that email exists, a password reset link has been sent',
      }
    } catch (error) {
      console.log('Failed to send password reset email:', error)
      throw new AuthServiceError(
        500,
        'Failed to send password reset email. Please try again later.',
      )
    }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }
    console.log('Forgot password error:', error)
    throw new AuthServiceError(500, 'An error occurred while processing your request')
  }
}

export const verifyResetToken = async (token: string) => {
  try {
    if (!token) {
      throw new AuthServiceError(400, 'Token is required')
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    console.log('HashedToken: ', hashedToken)
    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })
    console.log('Token Account: ', account?.passwordResetToken)

    if (!account) {
      throw new AuthServiceError(401, 'Invalid or expired password reset token')
    }

    return { success: 'Token is valid' }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }
    console.log('Token verification error:', error)
    throw new AuthServiceError(500, 'An error occurred while verifying the token')
  }
}

export const resetPassword = async (token: string, password: string) => {
  try {
    if (!token || !password) {
      throw new AuthServiceError(400, 'Token and password are required')
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })
    if (!account) {
      throw new AuthServiceError(401, 'Invalid or expired password reset token')
    }

    account.email = account.email.toLowerCase()
    account.password = password
    account.passwordResetToken = undefined
    account.passwordResetExpires = undefined
    await account.save()

    try {
      await Mailer.sendPasswordResetConfirmationEmail(account.email)
      return { message: 'Password reset successful' }
    } catch (error) {
      console.log('Failed to send password reset confirmation email:', error)
      return { message: 'Password reset successful, but confirmation email could not be sent' }
    }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }
    console.log('Reset password error:', error)
    throw new AuthServiceError(500, 'Failed to reset password')
  }
}

export const resendEmailVerification = async (email: string) => {
  if (!email) {
    throw new AuthServiceError(400, 'Email is required')
  }

  const normalizedEmail = email.toLowerCase()
  const account = await Account.findOne({ email: normalizedEmail })
  if (!account) {
    throw new AuthServiceError(404, 'No account found with that email address')
  }
  if (account.emailVerified) {
    throw new AuthServiceError(400, 'Email is already verified.')
  }

  const verificationToken = crypto.randomBytes(32).toString('hex')
  account.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')
  account.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION)
  await account.save()

  try {
    await Mailer.sendVerificationEmail(normalizedEmail, verificationToken)
    return { success: 'Verification email sent. Please check your inbox.' }
  } catch (error) {
    console.log('Failed to send verification email:', error)
    throw new AuthServiceError(
      500,
      'Failed to send verification email. Please try again later.',
    )
  }
}

export const googleOAuthCallback = async (code: string, codeVerifier: string) => {
  if (!code || !codeVerifier) {
    throw new AuthServiceError(400, 'Missing required parameters')
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: process.env.DESKTOP_CLIENT_ID as string,
      client_secret: process.env.DESKTOP_CLIENT_SECRET as string,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'com.teams-management.vn://oauth/callback',
      code_verifier: codeVerifier,
    })

    console.log('[OAuth PKCE] Exchanging code for tokens...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    })
    const tokens = await tokenResponse.json()
    console.log('[OAuth PKCE] Token response status:', tokenResponse.status)

    if (!tokenResponse.ok || !tokens.access_token) {
      const tokenError =
        tokens.error_description || tokens.error || 'Failed to get access token'
      console.log('[OAuth PKCE] Token exchange failed:', tokenError)
      throw new Error('Token exchange failed: ' + tokenError)
    }

    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    )
    const userData = await userInfoResponse.json()
    console.log('[OAuth PKCE] User info:', userData)

    if (!userData.email) {
      throw new Error('Failed to get user email from Google')
    }

    const email = userData.email.toLowerCase()
    const existingUser = await Account.findOne({ email })
    if (existingUser) {
      return {
        success: 'login',
        userId: existingUser._id.toString(),
        username: existingUser.username,
        email: existingUser.email,
      }
    }

    return {
      success: 'register',
      email,
      username: userData.given_name || userData.name || '',
    }
  } catch (error) {
    console.log('[OAuth PKCE] Callback error:', error)
    throw new AuthServiceError(
      500,
      errorMessage(error, 'Failed to process OAuth callback'),
    )
  }
}

export default {
  oAuthLookup,
  oAuthRegister,
  localRegister,
  localLogin,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  resendEmailVerification,
  googleOAuthCallback,
  createSampleTeamAndTasks,
}
