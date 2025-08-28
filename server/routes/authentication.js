import Account from '../models/Account.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sendEmail from '../scripts/mailer.js'
import 'dotenv/config'
const getUserIDAndEmailByName = async (req, res) => {
  const { username } = req.params
  console.log('Username:', username)
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }

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
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const existingUser = await Account.findOne({ email })
  console.log(existingUser)
  if (!existingUser) {
    // No user --> require username for register
    return res.status(202).json({ success: 'register' })
  } else {
    // Has user --> authorize
    return res.status(202).json({ success: 'login', username: existingUser.username })
  }
}

// ####################################################################################

const oAuthenticationRegister = async (req, res) => {
  const { username, email } = req.body
  const provider = 'google'
  console.log(username, email)
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  console.log(existingUser)
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
  console.log('Existing user test passed')
  try {
    const account = new Account({ username, email, provider })
    // console.log(crypto.createHash('sha256').update())
    await account.save()
    res.status(201).json({ success: 'Account created successfully.' })
  } catch (err) {
    res.status(400).json({ error: err })
  }
}

const localRegister = async (req, res) => {
  const { username, email, password } = req.body
  const provider = 'local'

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
    res.status(201).json({ success: 'Account created successfully.' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

const localLogin = async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  const account = await Account.findOne({ username, provider: 'local' })
  if (!account) {
    // console.log("No Account")
    return res.status(400).json({ error: 'Invalid username or password' })
  }

  const isMatch = await bcrypt.compare(password, account.password)
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid username or password' })
  } else {
    // console.log('Matched!')
    return res.status(201).json({ success: 'User is authorized' })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const account = await Account.findOne({ email })

    if (!account) {
      return res.status(404).json({ error: 'No account found with that email address' })
    }

    const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    })
    account.passwordResetToken = token
    account.passwordResetExpires = Date.now() + 900000 // 15 minutes from now
    await account.save()

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`
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
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'Token is required' })
  }
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  const account = await Account.findOne({
    _id: decodedToken.id,
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  })
  if (!account) {
    console.log('account not found or token expired')
    return res.status(401).json({ error: 'Invalid or expired password reset token' })
  }
  return res.status(200).json({ success: 'Token is valid' })
}

const resetPassword = async (req, res) => {
  const { token, password } = req.body

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    console.log(decodedToken)
    console.log(token)
    console.log(password)
    const account = await Account.findOne({
      _id: decodedToken.id,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!account) {
      console.log('account not found or token expired')
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }

    account.password = password
    account.passwordResetToken = undefined
    account.passwordResetExpires = undefined
    console.log(account.password)
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
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired password reset token' })
    }
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
