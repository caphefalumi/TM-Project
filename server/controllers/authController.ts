import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import TeamsController from './teamsController.js'
import Account from '../models/Account.js'
import Mailer from '../scripts/mailer.js'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import Tasks from '../models/Tasks.js'
const { addTeamPro } = TeamsController

import dotenv from 'dotenv'
dotenv.config({ quiet: true })

const EMAIL_VERIFICATION_EXPIRATION = 24 * 60 * 60 * 1000 // 24 hours

// This is only called when user submit forms in OAuth for registration / login
// Returns message for Gmail OAuth

const oAuthentication = async (req, res) => {
  const googleAccessToken = req.body.token
  if (!googleAccessToken) {
    return res.status(400).json({ message: 'No access token provided' })
  }
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    method: 'GET',
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  })
  const googleUser = await response.json()

  const { email } = googleUser

  const existingUser = await Account.findOne({ email })
  if (!existingUser) {
    // No user --> require username for register
    console.log('OAuth registration for new user with email:', email)

    return res.status(202).json({ success: 'register' })
  } else {
    // Has user --> authorize
    console.log('OAuth login for existing user:', existingUser.username)
    return res.status(202).json({
      success: 'login',
      username: existingUser.username,
      userId: existingUser._id.toString(),
      email: existingUser.email,
    })
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
    console.log('Error creating sample team and tasks:', error)
    throw error
  }
}

const oAuthenticationRegister = async (req, res) => {
  let { username, token } = req.body
  const provider = 'google'
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }
  if (!token) {
    return res.status(400).json({ message: 'No access token provided' })
  }
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const googleUser = await response.json()

  const { email } = googleUser
  console.log('REGISTER EMAIL: ', email)
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(402).json({ error: 'Username already exists.' })
    } else if (existingUser.email === email) {
      // double check: If the email is created
      // and the user is able to move on to the second phase: input username only
      // --> Could be duplicated if we dont check email
      return res.status(403).json({ error: 'Email already exists.' })
    }
  }
  try {
    const account = new Account({ username, email, provider, emailVerified: true })
    await account.save()
    await createSampleTeamAndTasks(account)
    res.status(201).json({
      success: 'Account created successfully. Sample team and tasks created.',
      userId: account._id.toString(),
      username: account.username,
      email: account.email,
    })
  } catch (err) {
    res.status(405).json({ error: err })
  }
}

const localRegister = async (req, res) => {
  let { username, email, password } = req.body
  const provider = 'local'

  // 1. Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  // 2. Check for unique username and email
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(400).json({ error: 'Username already exists.' })
    }
    if (existingUser.email === email) {
      return res.status(400).json({ error: 'Email already exists.' })
    }
  }

  // 3. Create and save account (password will be hashed by pre-save hook)
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
    res
      .status(201)
      .json({ success: 'Account created. Please verify your email to activate your account.' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

const localLogin = async (req, res) => {
  let { username, password } = req.body
  if (!username || !password) {
    console.log('Missing fields:', { username, password })
    return res.status(400).json({ error: 'All fields are required.' })
  }

  const account = await Account.findOne({ username })
  if (!account) {
    console.log('No Account')
    return res.status(400).json({ error: 'Invalid username or password' })
  }

  const isMatch = await bcrypt.compare(password, account.password)
  if (!isMatch) {
    console.log('Password mismatch')
    return res.status(400).json({ error: 'Invalid username or password' })
  }

  // Check for suspicious activity before allowing login
  const suspiciousActivity = await RefreshTokenManager.checkSuspiciousActivity(account._id)
  if (suspiciousActivity.isSuspicious) {
    console.log(
      `Suspicious activity detected for user ${account._id}: ${suspiciousActivity.recentUniqueIPs} different IPs in last 24 hours`,
    )
    // Optionally revoke all existing tokens or require additional verification
    await RefreshTokenManager.revokeAllUserTokens(account._id, 'suspicious_activity')
  }
  if (account.emailVerified === false) {
    return res
      .status(403)
      .json({ error: 'Email not verified. Please verify your email before logging in.' })
  }
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
      await Mailer.sendResetPasswordEmail(account.email, resetToken)
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent',
      })
    } catch (err) {
      console.log('Failed to send password reset email:', err)
      res
        .status(500)
        .json({ error: 'Failed to send password reset email. Please try again later.' })
    }
  } catch (error) {
    console.log('Forgot password error:', error)
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
    console.log('HashedToken: ', hashedToken)
    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })
    console.log('Token Account: ', account.passwordResetToken)

    if (!account) {
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }

    return res.status(200).json({ success: 'Token is valid' })
  } catch (error) {
    console.log('Token verification error:', error)
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
    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })
    if (!account) {
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }
    account.email = account.email.toLowerCase()
    account.password = password
    account.passwordResetToken = undefined
    account.passwordResetExpires = undefined
    await account.save()
    try {
      await Mailer.sendPasswordResetConfirmationEmail(account.email)
      res.json({ message: 'Password reset successful' })
    } catch (err) {
      console.log('Failed to send password reset confirmation email:', err)
      res.json({ message: 'Password reset successful, but confirmation email could not be sent' })
    }
  } catch (err) {
    console.log('Reset password error:', err)
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
    console.log('Failed to send verification email:', err)
    return res
      .status(500)
      .json({ error: 'Failed to send verification email. Please try again later.' })
  }
}

// Google OAuth PKCE Callback Handler
const googleOAuthCallback = async (req, res) => {
  const { code, codeVerifier, state } = req.body

  if (!code || !codeVerifier) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    const CLIENT_ID = process.env.DESKTOP_CLIENT_ID
    const CLIENT_SECRET = process.env.DESKTOP_CLIENT_SECRET
    const REDIRECT_URI = 'com.teams-management.vn://oauth/callback'

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    })

    console.log('[OAuth PKCE] Exchanging code for tokens...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    })

    const tokens = await tokenResponse.json()
    console.log('[OAuth PKCE] Token response status:', tokenResponse.status)

    if (!tokenResponse.ok || !tokens.access_token) {
      const errorMsg = tokens.error_description || tokens.error || 'Failed to get access token'
      console.log('[OAuth PKCE] Token exchange failed:', errorMsg)
      throw new Error('Token exchange failed: ' + errorMsg)
    }

    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })
    const userData = await userInfoResponse.json()
    console.log('[OAuth PKCE] User info:', userData)

    if (!userData.email) {
      throw new Error('Failed to get user email from Google')
    }

    // Check if user exists in DB
    const existingUser = await Account.findOne({ email: userData.email.toLowerCase() })
    if (existingUser) {
      // User exists - return login success
      return res.status(200).json({
        success: 'login',
        userId: existingUser._id.toString(),
        username: existingUser.username,
        email: existingUser.email,
      })
    } else {
      // New user - return registration needed
      return res.status(200).json({
        success: 'register',
        email: userData.email.toLowerCase(),
        username: userData.given_name || userData.name || '',
      })
    }
  } catch (err) {
    console.log('[OAuth PKCE] Callback error:', err)
    return res.status(500).json({ error: err.message || 'Failed to process OAuth callback' })
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
