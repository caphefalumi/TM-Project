import nodemailer from 'nodemailer'
import 'dotenv/config'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
})

class Mailer {
  static async sendMail(mailOptions) {
    try {
      await transporter.sendMail(mailOptions)
      console.log('Email sent successfully!')
      return true
    } catch (err) {
      console.error('Error sending email:', err)
      return false
    }
  }

  static async sendResetPassword(user, token) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`
    const mailOptions = {
      from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
      to: user.email,
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
             This link will expire in <strong>15 minutes</strong>.<br>
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
    return await Mailer.sendMail(mailOptions)
  }

  static async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`
    const mailOptions = {
      from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4A90E2; margin-bottom: 12px;">Verify your email</h2>
          <p>Please verify your email address by clicking the button below within the next 24 hours:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${verificationUrl}" style="background-color: #4A90E2; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify email address</a>
          </p>
          <p style="font-size: 14px; color: #666;">If you did not register, you can safely ignore this email.</p>
        </div>
      `,
    }
    return await Mailer.sendMail(mailOptions)
  }

  static async sendResetConfirmation(user) {
    const mailOptions = {
      from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
      to: user.email,
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
    return await Mailer.sendMail(mailOptions)
  }

  static async sendSecurityAlert(recipientEmail, subject, message) {
    if (!recipientEmail) {
      return false
    }

    const mailOptions = {
      from: `PM-PROJECT <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      text: message,
    }

    return await Mailer.sendMail(mailOptions)
  }
}

export default Mailer
