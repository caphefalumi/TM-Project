import TeamsRoutes from './teams.js'
const { addTeamPro } = TeamsRoutes

import Account from '../models/Account.js'
import crypto from 'crypto'
import sendEmail from '../scripts/mailer.js'
import RefreshTokenManager from '../scripts/refreshTokenManager.js'
import Teams from '../models/Teams.js'
import Tasks from '../models/Tasks.js'



import 'dotenv/config'
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
        username
      }
    }

    let teamId = null
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 200 && data.teamId) {
            teamId = data.teamId
          }
          return { status: code, data }
        }
      })
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
    console.log('Sample team and tasks created successfully for user:', username)
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
    const account = new Account({ username, email, provider })
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
    const account = new Account({ username, email, password, provider })
    await account.save()
    await createSampleTeamAndTasks(account)
    console.log("Created account and sample team/tasks for user:", username)
    res
      .status(201)
      .json({ success: 'Account created successfully. Sample team and tasks created.' })
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

  // Convert username to lowercase
  username = username.toLowerCase()

  const account = await Account.findOne({ username })
  if (!account) {
    console.log('No Account')
    return res.status(400).json({ error: 'Invalid username or password' })
  }

  // const isMatch = await bcrypt.compare(password, account.password)
  // if (!isMatch) {
  //   console.log('Password mismatch')
  //   return res.status(400).json({ error: 'Invalid username or password' })
  // }

  // Check for suspicious activity before allowing login
  const suspiciousActivity = await RefreshTokenManager.checkSuspiciousActivity(account._id)
  if (suspiciousActivity.isSuspicious) {
    console.log(
      `Suspicious activity detected for user ${account._id}: ${suspiciousActivity.recentUniqueIPs} different IPs in last 24 hours`,
    )
    // Optionally revoke all existing tokens or require additional verification
    // await RefreshTokenManager.revokeAllUserTokens(account._id, 'suspicious_activity')
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

    // Generate a random token using crypto
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Hash the token before storing it in the database for security
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    account.passwordResetToken = hashedToken
    account.passwordResetExpires = Date.now() + 900000 // 15 minutes from now
    await account.save()

    // Use the plain token (not hashed) for the email link
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`
    const mailOptions = {
      from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
      to: account.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4A90E2;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You recently requested to reset your password. Please click the button below to set a new one:</p>

          <p style="text-align: center;">
            <a href="${resetUrl}"
              style="background-color: #4A90E2; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </p>

          <p style="margin-top: 20px; font-size: 14px; color: #d9534f;">
             This link will expire in <strong>15 minutes</strong>.
            If you did not request a password reset, you can safely ignore this email.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #777;">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
        </div>
      `,
    }

    try {
      await sendEmail(mailOptions)
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent',
      })
    } catch (err) {
      console.error('Failed to send password reset email:', err)
      res
        .status(500)
        .json({ error: 'Failed to send password reset email. Please try again later.' })
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
      console.log('Account not found or token expired')
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

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!account) {
      console.log('Account not found or token expired')
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }

    // Ensure email is lowercase before sending confirmation
    account.email = account.email.toLowerCase()

    // Update password and clear reset token fields
    account.password = password
    account.passwordResetToken = undefined
    account.passwordResetExpires = undefined
    await account.save()

    const mailOptions = {
      from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
      to: account.email,
      subject: 'Password Reset Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4A90E2;">Password Reset Successful</h2>
          <p>Hello,</p>
          <p>Your password has been successfully reset. You can now log in with your new password.</p>
          <p style="margin-top: 20px; font-size: 14px; color: #d9534f;">
            If you did not initiate this request, please contact us immediately for security reasons.
          </p>
          <p>Best regards,<br>Your Team Management System</p>
        </div>
      `,
    }

    try {
      await sendEmail(mailOptions)
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



export default {
  getUserIDAndEmailByName,
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
  forgotPassword,
  resetPassword,
  verifyToken,
}
