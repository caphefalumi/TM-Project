import dotenv from 'dotenv'
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend'
dotenv.config({ quiet: true })

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
})

class Mailer {
  static async sendMail(mailOptions) {
    try {
      const sentFrom = new Sender(
        "admin@tm-project.id.vn",
        "Teams Management"
      )
      const recipients = [new Recipient(mailOptions.to, '')]
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(mailOptions.subject)
        .setHtml(mailOptions.html)
        .setText(mailOptions.html.replace(/<[^>]+>/g, ''))
      await mailerSend.email.send(emailParams)
      console.log('Email sent successfully via MailerSend API!')
      return true;
    } catch (err) {
      console.log('Error sending email via MailerSend API:', err)
      return false;
    }
  }

  static async sendResetPasswordEmail(email, token) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`
    const mailOptions = {
      to: email,
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

  static async sendPasswordResetConfirmationEmail(email) {
    const mailOptions = {
      to: email,
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

  static async sendNewEmailVerificationEmail(email, verificationUrl) {
    const mailOptions = {
      to: email,
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
    }
    return await Mailer.sendMail(mailOptions)
  }

  static async sendEmailUpdateConfirmation(account) {
    const mailOptions = {
      to: account.email,
      subject: 'Your email address has been updated',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4A90E2;">Email Updated</h2>
          <p>Hello ${account.username || ''},</p>
          <p>Your account email has been successfully updated to <strong>${account.email}</strong>.</p>
          <p>If you did not make this change, please contact support immediately or reset your password.</p>
          <p>Best regards,<br/>Your Team Management System</p>
        </div>
      `,
    }
    return await Mailer.sendMail(mailOptions)
  }
}
export default Mailer
