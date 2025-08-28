import nodemailer from "nodemailer"
import 'dotenv/config'
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		type: "OAuth2",
		user: process.env.EMAIL_USER,
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
	},
})

const sendEmail = async mailOptions => {
	try {
		await transporter.sendMail(mailOptions)
		console.log("Email sent successfully!")
	} catch (err) {
		console.error("Error sending email:", err)
	}
}
export default sendEmail