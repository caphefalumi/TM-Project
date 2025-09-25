import TeamsRoutes from './teams.js'
const { addTeamPro } = TeamsRoutes
import Account from '../models/Account.js'
import crypto from 'crypto'
import Mailer from '../scripts/mailer.js'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import Tasks from '../models/Tasks.js'
import bcrypt from 'bcryptjs'
import LoginAttempt from '../models/LoginAttempt.js'
import { validatePasswordStrength, checkPasswordPwned } from '../utils/passwordPolicy.js'
import { authenticator } from 'otplib'
import { encryptSecret, decryptSecret } from '../utils/mfaCrypto.js'
import MonitoringService from '../scripts/monitoringService.js'
import { recordSecurityEvent } from '../scripts/securityEventService.js'

import 'dotenv/config'

const EMAIL_VERIFICATION_EXPIRATION = 24 * 60 * 60 * 1000 // 24 hours
const LOGIN_CAPTCHA_THRESHOLD = 3
const LOCKOUT_STEPS = [
  { attempts: 5, minutes: 5 },
  { attempts: 8, minutes: 30 },
  { attempts: 10, minutes: 4 * 60 },
]

const loginAttemptKey = (username, ipAddress) => `${username || 'unknown'}:${ipAddress}`

const computeLockoutDuration = (attempts) => {
  for (let i = LOCKOUT_STEPS.length - 1; i >= 0; i--) {
    if (attempts >= LOCKOUT_STEPS[i].attempts) {
      return LOCKOUT_STEPS[i].minutes
    }
  }
  return 0
}

const getOrCreateLoginAttempt = async (username, ipAddress) => {
  const key = loginAttemptKey(username, ipAddress)
  let attempt = await LoginAttempt.findOne({ key })
  if (!attempt) {
    attempt = new LoginAttempt({ key, username, ipAddress })
  }
  return attempt
}

const registerFailedAttempt = async (username, ipAddress) => {
  const attempt = await getOrCreateLoginAttempt(username, ipAddress)
  attempt.attempts += 1
  attempt.lastAttemptAt = new Date()

  if (attempt.attempts >= LOGIN_CAPTCHA_THRESHOLD) {
    attempt.requireCaptchaUntil = new Date(Date.now() + 15 * 60 * 1000)
  }

  const lockMinutes = computeLockoutDuration(attempt.attempts)
  if (lockMinutes > 0) {
    attempt.lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000)
  }

  await attempt.save()
  return attempt
}

const resetLoginAttempts = async (username, ipAddress) => {
  const key = loginAttemptKey(username, ipAddress)
  await LoginAttempt.findOneAndDelete({ key })
}

const isCaptchaEnforced = (attempt) =>
  attempt?.requireCaptchaUntil && attempt.requireCaptchaUntil > Date.now()

const getUserIDAndEmailByName = async (req, res) => {
  let { username } = req.params
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }
  username = username.toLowerCase()
  try {
    const account = await Account.findOne({ username })
    if (!account) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.status(200).json({
      userId: account._id,
      email: account.email,
      success: 'User found',
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// This is only called when user submit forms in OAuth for registration / login
// Returns message for Gmail OAuth

const oAuthentication = async (req, res) => {
  let { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }
  email = email.toLowerCase()
  const existingUser = await Account.findOne({ email })
  if (!existingUser) {
    // No user --> require username for register
    return res.status(202).json({ success: 'register' })
  } else {
    // Has user --> authorize
    return res.status(202).json({ success: 'login', username: existingUser.username })
  }
}

// ####################################################################################

// Helper function to create a sample team and sample tasks for a new user
async function createSampleTeamAndTasks(account) {
  try {
    // Create a sample team for the new user using addTeamPro
    const title = `${account.username}'s Sample Team`
    const category = 'Development'
    const description = 'This is your first sample team. You can edit or delete it.'
    const userId = account._id.toString()
    const username = account.username

    // Create mock request and response objects for addTeamPro
    const mockReq = {
      body: {
        title,
        category,
        description,
        parentTeamId: null, // No parent team for sample team
        userId,
        username,
      },
    }

    let teamId = null
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 200 && data.teamId) {
            teamId = data.teamId
          }
          return { status: code, data }
        },
      }),
    }

    // Use addTeamPro to create the team
    await addTeamPro(mockReq, mockRes)

    if (!teamId) {
      throw new Error('Failed to create sample team')
    }

    // Create sample tasks for the team
    const now = new Date()
    const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week later
    const sampleTasks = [
      new Tasks({
        userId: account._id.toString(),
        teamId: teamId.toString(),
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
        userId: account._id.toString(),
        teamId: teamId.toString(),
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
    console.error('Error creating sample team and tasks:', error)
    throw error
  }
}

const oAuthenticationRegister = async (req, res) => {
  let { username, email } = req.body
  const provider = 'google'
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }
  username = username.toLowerCase()
  email = email.toLowerCase()
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(400).json({ error: 'Username already exists.' })
    } else if (existingUser.email === email) {
      // double check: If the email is created
      // and the user is able to move on to the second phase: input username only
      // --> Could be duplicated if we dont check email
      return res.status(400).json({ error: 'Email already exists.' })
    }
  }
  try {
    const account = new Account({ username, email, provider, emailVerified: true })
    await account.save()
    await createSampleTeamAndTasks(account)
    res
      .status(201)
      .json({ success: 'Account created successfully. Sample team and tasks created.' })
  } catch (err) {
    res.status(400).json({ error: err })
  }
}

const localRegister = async (req, res) => {
  let { username, email, password } = req.body
  const provider = 'local'

  // Convert username to lowercase
  if (username) username = username.toLowerCase()

  // 1. Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  // 2. Validate password strength and exposure
  const strength = validatePasswordStrength(password, { email, username })
  if (!strength.valid) {
    return res.status(400).json({
      error: strength.reason,
      suggestions: strength.suggestions,
    })
  }

  const pwnedResult = await checkPasswordPwned(password)
  if (pwnedResult.error) {
    console.warn('HaveIBeenPwned check failed:', pwnedResult.error.message)
  }
  if (pwnedResult.pwned) {
    return res.status(400).json({
      error: 'This password appears in known breach datasets. Please choose another password.',
    })
  }

  // 3. Check for unique username and email
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(400).json({ error: 'Username already exists.' })
    }
    if (existingUser.email === email) {
      return res.status(400).json({ error: 'Email already exists.' })
    }
  }

  // 4. Create and save account (password will be hashed by pre-save hook)
  try {
    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex')
    const account = new Account({
      username,
      email,
      password,
      provider,
      emailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION),
    })
    await account.save()
    await createSampleTeamAndTasks(account)

    // Send verification email
    await Mailer.sendVerificationEmail(email, verificationToken)

    console.log('Created account and sample team/tasks for user:', username)
    res.status(201).json({ success: 'Account created. Please verify your email to activate your account.' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

const localLogin = async (req, res) => {
  let { username, password, totpCode, captchaToken } = req.body
  if (!username || !password) {
    console.log('Missing fields:', { username, password })
    return res.status(400).json({ error: 'All fields are required.' })
  }

  const ipAddress = req.clientIp
  username = username.toLowerCase()

  const attemptRecord = await LoginAttempt.findOne({
    key: loginAttemptKey(username, ipAddress),
  })

  if (attemptRecord?.lockUntil && attemptRecord.lockUntil > Date.now()) {
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      lockExpiresAt: attemptRecord.lockUntil,
      requireCaptcha: isCaptchaEnforced(attemptRecord),
    })
  }

  if (isCaptchaEnforced(attemptRecord) && !captchaToken) {
    return res.status(403).json({
      error: 'CAPTCHA verification required before continuing.',
      requireCaptcha: true,
    })
  }

  const account = await Account.findOne({ username })
  if (!account) {
    const attempt = await registerFailedAttempt(username, ipAddress)
    await MonitoringService.recordMetric('login.failure')
    console.log('No Account')
    return res.status(400).json({
      error: 'Invalid username or password',
      requireCaptcha: isCaptchaEnforced(attempt),
    })
  }

  const isMatch = await bcrypt.compare(password, account.password)
  if (!isMatch) {
    const attempt = await registerFailedAttempt(username, ipAddress)
    await MonitoringService.recordMetric('login.failure')
    console.log('Password mismatch')
    return res.status(400).json({
      error: 'Invalid username or password',
      requireCaptcha: isCaptchaEnforced(attempt),
    })
  }

  if (account.emailVerified === false) {
    return res
      .status(403)
      .json({ error: 'Email not verified. Please verify your email before logging in.' })
  }

  // Check for suspicious activity before allowing login
  const suspiciousActivity = await RefreshTokenManager.checkSuspiciousActivity(account._id)
  if (suspiciousActivity.isSuspicious) {
    console.log(
      `Suspicious activity detected for user ${account._id}: ${suspiciousActivity.recentUniqueIPs} different IPs in last 24 hours`,
    )
    await recordSecurityEvent({
      userId: account._id,
      type: 'suspicious_login_activity',
      severity: 'medium',
      description: 'Unusual login activity detected. Existing sessions revoked.',
      metadata: suspiciousActivity,
      notifyAdmins: true,
    })
    await RefreshTokenManager.revokeAllUserTokens(account._id, 'suspicious_activity')
  }

  const enforceMfa = account.mfa?.enforced
  const totpEnabled = account.mfa?.totp?.enabled
  if (enforceMfa && !totpEnabled) {
    return res.status(403).json({
      error: 'Multi-factor authentication must be configured before accessing this account.',
      mfaSetupRequired: true,
    })
  }

  if (totpEnabled) {
    if (!totpCode) {
      return res.status(403).json({
        error: 'MFA code required',
        mfaRequired: true,
      })
    }

    try {
      const secretData = account.mfa.totp.secret
      if (!secretData?.encryptedSecret) {
        return res.status(403).json({
          error: 'MFA secret missing. Please reconfigure your authenticator app.',
          mfaSetupRequired: true,
        })
      }

      const secret = decryptSecret(secretData)
      const isValidTotp = authenticator.check(totpCode, secret)
      if (!isValidTotp) {
        const attempt = await registerFailedAttempt(username, ipAddress)
        await MonitoringService.recordMetric('login.failure')
        return res.status(400).json({
          error: 'Invalid MFA code',
          mfaRequired: true,
          requireCaptcha: isCaptchaEnforced(attempt),
        })
      }
      account.mfa.totp.lastVerifiedAt = new Date()
      await account.save()
    } catch (error) {
      console.error('Failed to validate TOTP secret:', error)
      return res.status(500).json({ error: 'Failed to validate MFA code. Please try again later.' })
    }
  }

  await resetLoginAttempts(username, ipAddress)
  await MonitoringService.recordMetric('login.success')

  // Create user object for token generation
  const user = {
    userId: account._id,
    username: account.username,
    email: account.email,
  }

  // Set user data and activity tracking info in request for token middleware
  req.body.user = user

  return res.status(200).json({
    success: 'User is authorized',
    user: {
      userId: account._id,
      username: account.username,
      email: account.email,
      mfaRequired: totpEnabled,
    },
  })
}

const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }
    email = email.toLowerCase()
    const account = await Account.findOne({ email })
    if (!account) {
      return res.status(404).json({ error: 'No account found with that email address' })
    }
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    account.passwordResetToken = hashedToken
    account.passwordResetExpires = Date.now() + 900000 // 15 minutes
    await account.save()
    try {
      await Mailer.sendResetPassword(account, resetToken)
      res.json({ message: 'If an account with that email exists, a password reset link has been sent' })
    } catch (err) {
      console.error('Failed to send password reset email:', err)
      res.status(500).json({ error: 'Failed to send password reset email. Please try again later.' })
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'An error occurred while processing your request' })
  }
}

const verifyToken = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!account) {
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }

    return res.status(200).json({ success: 'Token is valid' })
  } catch (error) {
    console.error('Token verification error:', error)
    return res.status(500).json({ error: 'An error occurred while verifying the token' })
  }
}

const resetPassword = async (req, res) => {
  try {
    let { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' })
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const account = await Account.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })
    if (!account) {
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }
    const strength = validatePasswordStrength(password, {
      email: account.email,
      username: account.username,
    })
    if (!strength.valid) {
      return res.status(400).json({ error: strength.reason, suggestions: strength.suggestions })
    }

    const pwnedResult = await checkPasswordPwned(password)
    if (pwnedResult.error) {
      console.warn('HaveIBeenPwned check failed during password reset:', pwnedResult.error.message)
    }
    if (pwnedResult.pwned) {
      return res.status(400).json({
        error: 'This password appears in known breach datasets. Please choose another password.',
      })
    }

    account.email = account.email.toLowerCase()
    account.password = password
    account.passwordResetToken = undefined
    account.passwordResetExpires = undefined
    await account.save()
    try {
      await Mailer.sendResetConfirmation(account)
      res.json({ message: 'Password reset successful' })
    } catch (err) {
      console.error('Failed to send password reset confirmation email:', err)
      res.json({ message: 'Password reset successful, but confirmation email could not be sent' })
    }
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

// Resend email verification link
const resendEmailVerification = async (req, res) => {
  let { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }
  email = email.toLowerCase()
  const account = await Account.findOne({ email })
  if (!account) {
    return res.status(404).json({ error: 'No account found with that email address' })
  }
  if (account.emailVerified) {
    return res.status(400).json({ error: 'Email is already verified.' })
  }
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex')
  account.emailVerificationToken = hashedToken
  account.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION)
  await account.save()
  try {
    await Mailer.sendVerificationEmail(email, verificationToken)
    return res.status(200).json({ success: 'Verification email sent. Please check your inbox.' })
  } catch (err) {
    console.error('Failed to send verification email:', err)
    return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' })
  }
}

const initiateTotpSetup = async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const account = await Account.findById(userId)
    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    const secret = authenticator.generateSecret()
    const issuer = process.env.MFA_ISSUER || 'TM-Project'
    const otpauthUrl = authenticator.keyuri(account.email, issuer, secret)
    const encrypted = encryptSecret(secret)

    account.mfa = account.mfa || {}
    account.mfa.totp = account.mfa?.totp || {}
    account.mfa.totp.pendingSecret = encrypted
    account.mfa.totp.pendingSecretCreatedAt = new Date()

    await account.save()

    await recordSecurityEvent({
      userId: userId,
      type: 'mfa_enrollment_initiated',
      severity: 'low',
      description: 'TOTP enrollment was initiated for your account.',
      metadata: { issuer },
      notifyAdmins: false,
    })

    return res.status(200).json({ secret, otpauthUrl })
  } catch (error) {
    console.error('Failed to initiate TOTP setup:', error)
    return res.status(500).json({ error: 'Failed to initiate TOTP setup' })
  }
}

const verifyTotpSetup = async (req, res) => {
  try {
    const userId = req.user?.userId
    const { token } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!token) {
      return res.status(400).json({ error: 'MFA token is required' })
    }

    const account = await Account.findById(userId)
    if (!account || !account.mfa?.totp?.pendingSecret) {
      return res.status(400).json({ error: 'No pending MFA enrollment found' })
    }

    const secret = decryptSecret(account.mfa.totp.pendingSecret)
    if (!authenticator.check(token, secret)) {
      return res.status(400).json({ error: 'Invalid MFA token' })
    }

    account.mfa.totp.secret = account.mfa.totp.pendingSecret
    account.mfa.totp.pendingSecret = undefined
    account.mfa.totp.pendingSecretCreatedAt = undefined
    account.mfa.totp.enabled = true
    account.mfa.totp.lastVerifiedAt = new Date()

    await account.save()

    await recordSecurityEvent({
      userId,
      type: 'mfa_enabled',
      severity: 'medium',
      description: 'TOTP multi-factor authentication has been enabled.',
      notifyAdmins: true,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Failed to verify TOTP setup:', error)
    return res.status(500).json({ error: 'Failed to verify TOTP setup' })
  }
}

const disableTotp = async (req, res) => {
  try {
    const userId = req.user?.userId
    const { token } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const account = await Account.findById(userId)
    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    if (account.mfa?.enforced) {
      return res.status(403).json({ error: 'MFA is enforced for this account and cannot be disabled.' })
    }

    if (!account.mfa?.totp?.enabled) {
      return res.status(400).json({ error: 'TOTP MFA is not enabled.' })
    }

    const secretData = account.mfa.totp.secret
    if (!secretData?.encryptedSecret) {
      return res.status(400).json({ error: 'MFA secret missing. Cannot disable at this time.' })
    }

    if (!token) {
      return res.status(400).json({ error: 'MFA token is required to disable TOTP.' })
    }

    const secret = decryptSecret(secretData)
    if (!authenticator.check(token, secret)) {
      return res.status(400).json({ error: 'Invalid MFA token provided.' })
    }

    account.mfa.totp.enabled = false
    account.mfa.totp.secret = undefined
    account.mfa.totp.lastVerifiedAt = undefined
    account.mfa.totp.pendingSecret = undefined
    account.mfa.totp.pendingSecretCreatedAt = undefined

    await account.save()

    await recordSecurityEvent({
      userId,
      type: 'mfa_disabled',
      severity: 'medium',
      description: 'TOTP multi-factor authentication has been disabled.',
      notifyAdmins: true,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Failed to disable TOTP:', error)
    return res.status(500).json({ error: 'Failed to disable TOTP' })
  }
}

export default {
  getUserIDAndEmailByName,
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
  forgotPassword,
  resetPassword,
  verifyToken,
  resendEmailVerification,
  initiateTotpSetup,
  verifyTotpSetup,
  disableTotp,
}
