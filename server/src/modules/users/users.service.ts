import crypto from 'crypto'
import Account from '../auth/account.model.js'
import RefreshToken from '../auth/refresh-token.model.js'
import { generateAccessToken, generateRefreshToken } from '../auth/token.service.js'
import UsersOfTeam from '../teams/team-membership.model.js'
import { TaskSubmissions } from '../tasks/task.model.js'
import Role from '../roles/role.model.js'
import Mailer from '../../shared/services/mailer.service.js'

const USERNAME_LOCK_DURATION = 14 * 24 * 60 * 60 * 1000
const EMAIL_LOCK_DURATION = 90 * 24 * 60 * 60 * 1000
const EMAIL_VERIFICATION_EXPIRATION = 24 * 60 * 60 * 1000
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

export type UsersServiceError = Error & {
  status: number
  body: Record<string, unknown>
}

export type TokenCookies = {
  accessToken: string
  refreshToken: string
}

const serviceError = (status: number, body: Record<string, unknown>): UsersServiceError => {
  return Object.assign(new Error(String(body.message || body.error || 'Users service error')), {
    status,
    body,
  })
}

export const isUsersServiceError = (error: unknown): error is UsersServiceError => {
  return (
    error instanceof Error &&
    typeof (error as UsersServiceError).status === 'number' &&
    typeof (error as UsersServiceError).body === 'object'
  )
}

const serializeUser = (account) => ({
  userId: account._id.toString(),
  username: account.username,
  email: account.email,
  emailVerified: account.emailVerified,
  lastUsernameChangeAt: account.lastUsernameChangeAt,
  lastEmailChangeAt: account.lastEmailChangeAt,
  emailVerificationExpires: account.emailVerificationExpires,
  createdAt: account.createdAt,
})

const generateTokens = (account): TokenCookies => {
  const userData = {
    userId: account._id.toString(),
    username: account.username,
    email: account.email,
  }
  return {
    accessToken: generateAccessToken(userData),
    refreshToken: generateRefreshToken(userData),
  }
}

export const getAuthenticatedUser = async (userId: string) => {
  const account = await Account.findById(userId).select(
    '_id username email emailVerified lastUsernameChangeAt lastEmailChangeAt emailVerificationExpires createdAt',
  )
  if (!account) {
    throw serviceError(404, { error: 'User not found' })
  }

  return {
    user: serializeUser(account),
    success: 'User data retrieved successfully',
  }
}

export const getAllUsers = async () => {
  const users = await Account.find({}, 'username _id').exec()
  if (!users || users.length === 0) {
    throw serviceError(404, { error: 'No users found' })
  }
  return users
}

export const updateUserProfile = async (
  requestingUserId: string,
  input: { username?: string; email?: string },
) => {
  let { username, email } = input
  if ((username !== undefined && !username.trim()) || (email !== undefined && !email.trim())) {
    throw serviceError(400, { error: 'Field cannot be empty' })
  }
  if (username === undefined && email === undefined) {
    throw serviceError(400, { error: 'No fields to update' })
  }

  username = username !== undefined ? username.trim() : undefined
  email = email !== undefined ? email.trim() : undefined

  const account = await Account.findById(requestingUserId)
  if (!account) {
    throw serviceError(404, { error: 'User not found' })
  }

  const previousEmail = account.email
  const previousEmailVerified = account.emailVerified
  const normalizedUsername = username
  const normalizedEmail = email !== undefined ? email.toLowerCase() : account.email
  const usernameChanged = username !== undefined && normalizedUsername !== account.username
  const emailChanged = email !== undefined && normalizedEmail !== account.email
  const reissueVerification = !emailChanged && account.email && account.email === normalizedEmail

  if (!usernameChanged && !emailChanged && !reissueVerification) {
    const usernameCooldownEndsAt =
      account.lastUsernameChangeAt &&
      new Date(account.lastUsernameChangeAt.getTime() + USERNAME_LOCK_DURATION)
    const emailCooldownEndsAt =
      account.lastEmailChangeAt &&
      new Date(account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION)

    return {
      body: {
        message: 'No changes detected',
        user: serializeUser(account),
        requiresEmailVerification: Boolean(account.email),
        usernameCooldownEndsAt: usernameCooldownEndsAt
          ? usernameCooldownEndsAt.toISOString()
          : null,
        emailCooldownEndsAt: emailCooldownEndsAt ? emailCooldownEndsAt.toISOString() : null,
        emailVerificationExpiresAt: account.emailVerificationExpires,
      },
      tokens: null,
    }
  }

  if (usernameChanged) {
    const existingUser = await Account.findOne({
      username: normalizedUsername,
      _id: { $ne: requestingUserId },
    })
    if (existingUser) {
      throw serviceError(400, { error: 'Username already exists' })
    }
    if (
      account.lastUsernameChangeAt &&
      Date.now() - account.lastUsernameChangeAt.getTime() < USERNAME_LOCK_DURATION
    ) {
      const availableAt = new Date(
        account.lastUsernameChangeAt.getTime() + USERNAME_LOCK_DURATION,
      )
      throw serviceError(400, {
        error: 'USERNAME_COOLDOWN',
        message: 'You can update your display name again once the lock period ends.',
        availableAt: availableAt.toISOString(),
      })
    }

    account.username = normalizedUsername
    account.lastUsernameChangeAt = new Date()
  }

  let verificationToken: string | null = null
  if (emailChanged || reissueVerification) {
    if (emailChanged) {
      const existingEmail = await Account.findOne({
        email: normalizedEmail,
        _id: { $ne: requestingUserId },
      })
      if (existingEmail) {
        throw serviceError(400, { error: 'Email already exists' })
      }
      if (
        account.lastEmailChangeAt &&
        Date.now() - account.lastEmailChangeAt.getTime() < EMAIL_LOCK_DURATION
      ) {
        const availableAt = new Date(account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION)
        throw serviceError(400, {
          error: 'EMAIL_COOLDOWN',
          message: 'You can update your email address again once the lock period ends.',
          availableAt: availableAt.toISOString(),
        })
      }

      account.email = normalizedEmail
      account.emailVerified = false
    }

    verificationToken = crypto.randomBytes(32).toString('hex')
    account.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex')
    account.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION)
  }

  await account.save()

  if (verificationToken) {
    const verificationUrl = `${CLIENT_URL}/verify-email?token=${verificationToken}`
    try {
      await Mailer.sendMail({
        to: account.email,
        subject: 'Confirm your new email address',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4A90E2; margin-bottom: 12px;">Verify your new email</h2>
            <p>We received a request to update the email on your account.</p>
            <p>Please confirm this change by clicking the button below within the next 24 hours:</p>
            <p style="text-align: center; margin: 24px 0;">
              <a href="${verificationUrl}" style="background-color: #4A90E2; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify new email address</a>
            </p>
            <p style="font-size: 14px; color: #666;">
              If you did not request this change, you can safely ignore this email and your address will remain the same.
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.log('Failed to send email verification:', error)
      account.emailVerificationToken = undefined
      account.emailVerificationExpires = undefined
      if (emailChanged) {
        account.email = previousEmail
        account.emailVerified = previousEmailVerified
      }
      await account.save()
      throw serviceError(500, {
        error: 'Failed to send verification email. Please try again later.',
      })
    }
  }

  let tokens: TokenCookies | null = null
  if (usernameChanged) {
    tokens = generateTokens(account)
    await RefreshToken.findOneAndUpdate(
      { userId: requestingUserId },
      { token: tokens.refreshToken, updatedAt: new Date() },
      { new: true },
    )
  }

  const usernameCooldownEndsAt =
    account.lastUsernameChangeAt &&
    new Date(account.lastUsernameChangeAt.getTime() + USERNAME_LOCK_DURATION)
  const emailCooldownEndsAt =
    account.lastEmailChangeAt &&
    new Date(account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION)

  return {
    body: {
      message: verificationToken
        ? `We've sent a verification link to ${account.email}. Please verify within 24 hours to complete the update.`
        : 'Profile updated successfully.',
      user: serializeUser(account),
      requiresEmailVerification: Boolean(account.email),
      usernameCooldownEndsAt: usernameCooldownEndsAt
        ? usernameCooldownEndsAt.toISOString()
        : null,
      emailCooldownEndsAt: emailCooldownEndsAt ? emailCooldownEndsAt.toISOString() : null,
      emailVerificationExpiresAt: account.emailVerificationExpires,
    },
    tokens,
  }
}

export const verifyEmailChange = async (token: string) => {
  if (!token) {
    throw serviceError(400, { error: 'Verification token is required' })
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const account = await Account.findOne({ emailVerificationToken: hashedToken })
  if (!account || !account.email) {
    throw serviceError(400, {
      error: 'Invalid or expired verification token. Please request a new change.',
    })
  }

  const newEmail = account.email
  account.emailVerificationToken = undefined
  account.emailVerificationExpires = undefined
  account.lastEmailChangeAt = new Date()
  account.emailVerified = true
  await account.save()

  await RefreshToken.updateMany(
    { userId: account._id.toString(), revoked: false },
    {
      revoked: true,
      revokedAt: new Date(),
      revokedReason: 'security',
    },
  )

  const tokens = generateTokens(account)
  await RefreshToken.findOneAndUpdate(
    { userId: account._id.toString() },
    { token: tokens.refreshToken, updatedAt: new Date() },
  )

  const emailCooldownEndsAt = new Date(
    account.lastEmailChangeAt.getTime() + EMAIL_LOCK_DURATION,
  ).toISOString()

  try {
    await Mailer.sendEmailUpdateConfirmation(account)
  } catch (error) {
    console.log('Failed to send confirmation email after verification:', error)
  }

  return {
    body: {
      success: 'Email verified successfully. Please sign in again to continue.',
      user: serializeUser(account),
      emailCooldownEndsAt,
    },
    tokens,
  }
}

export const deleteUserAccount = async (requestingUserId: string) => {
  const user = await Account.findById(requestingUserId)
  if (!user) {
    throw serviceError(404, { error: 'User not found' })
  }

  await UsersOfTeam.deleteMany({ userId: requestingUserId })
  await TaskSubmissions.deleteMany({ userId: requestingUserId })
  await Role.deleteMany({ created_by: requestingUserId })
  await Account.findByIdAndDelete(requestingUserId)

  return { success: 'Account deleted successfully' }
}
