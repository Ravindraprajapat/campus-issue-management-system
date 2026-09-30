import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

// Preserved existing OTP Email functionality
export const sendOtpMail = async (to, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: to,  
    subject: "Reset your Password",
    html: `<p>Your OTP for password reset is <b>${otp}</b>. This OTP is valid for 10 minutes.</p>`
  })
}

// 1. Complaint Registered Email using existing transporter (process.env.EMAIL / process.env.PASS)
export const sendComplaintRegisteredMail = async (to, report, user) => {
  try {
    if (!process.env.EMAIL || !process.env.PASS) {
      console.log('Nodemailer EMAIL/PASS not configured in .env. Skipping complaint registered email.')
      return
    }

    const mailOptions = {
      from: `"Parul University Support" <${process.env.EMAIL}>`,
      to: to,
      subject: `Campus Issue Report Registered - ${report._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #0284c7;">Hello ${user?.name || 'User'},</h2>
          <p>Your campus issue report has been successfully registered on FaultLine AI.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Report ID:</strong> ${report._id}</p>
            <p><strong>Issue Type:</strong> ${report.aiAnalysis?.detectedType || 'Campus Issue'}</p>
            <p><strong>Priority:</strong> ${report.priorityLevel || 'MEDIUM'}</p>
            <p><strong>Building:</strong> ${report.location?.building || 'Campus'}</p>
            <p><strong>Location:</strong> ${report.location?.address || 'Provided GPS location'}</p>
          </div>
          <p>Your report has been forwarded to the concerned Parul University maintenance team.</p>
          <p>You will receive another notification when the issue is resolved.</p>
          <br />
          <p>Thank you,<br /><strong>Parul University Maintenance Platform</strong></p>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`Complaint Registration Email sent to ${to}: ${info.messageId}`)
  } catch (error) {
    console.error('Complaint Registered Email Error:', error)
  }
}

// 2. Complaint Resolved Email using existing transporter (process.env.EMAIL / process.env.PASS)
export const sendComplaintResolvedMail = async (to, report, user) => {
  try {
    if (!process.env.EMAIL || !process.env.PASS) {
      console.log('Nodemailer EMAIL/PASS not configured in .env. Skipping complaint resolved email.')
      return
    }

    const mailOptions = {
      from: `"Parul University Support" <${process.env.EMAIL}>`,
      to: to,
      subject: `Campus Issue Report Resolved - ${report._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #16a34a;">Hello ${user?.name || 'User'},</h2>
          <p>Great news! Your campus issue report has been successfully <strong>RESOLVED</strong> by the maintenance team.</p>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #bbf7d0;">
            <p><strong>Report ID:</strong> ${report._id}</p>
            <p><strong>Issue Type:</strong> ${report.aiAnalysis?.detectedType || 'Campus Issue'}</p>
            <p><strong>Building:</strong> ${report.location?.building || 'Campus Building'}</p>
            <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">RESOLVED</span></p>
          </div>
          <p>Please open the application to view the updated report details.</p>
          <br />
          <p>Thank you for helping keep our campus safe and functional!<br /><strong>Parul University Maintenance Platform</strong></p>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`Complaint Resolution Email sent to ${to}: ${info.messageId}`)
  } catch (error) {
    console.error('Complaint Resolved Email Error:', error)
  }
}