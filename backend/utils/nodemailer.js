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

// Non-blocking Transporter Connection Verification
if (process.env.EMAIL && process.env.PASS) {
  console.log('[MAIL] Transporter configured: true')
  console.log('[MAIL] SMTP connection test started')
  transporter.verify((error, success) => {
    if (error) {
      console.error('[MAIL ERROR] SMTP connection verification failed')
      console.error('[MAIL ERROR] Error code:', error.code || 'UNKNOWN')
      console.error('[MAIL ERROR] Error message:', error.message)
      if (error.responseCode) console.error('[MAIL ERROR] Response code:', error.responseCode)
    } else {
      console.log('[MAIL] SMTP connection successful')
    }
  })
} else {
  console.log('[MAIL] Transporter configured: false (EMAIL or PASS missing in environment variables)')
}

// Preserved existing OTP Email functionality
export const sendOtpMail = async (to, otp) => {
  const hasTransporter = !!(process.env.EMAIL && process.env.PASS)
  console.log('[MAIL] Sending email: Password Reset OTP')
  console.log(`[MAIL] Recipient configured: ${!!to}`)
  console.log(`[MAIL] Transporter configured: ${hasTransporter}`)

  if (!hasTransporter) {
    console.error('[MAIL ERROR] Email sending skipped: EMAIL or PASS environment variable missing')
    return
  }

  try {
    const info = await transporter.sendMail({
      from: `"UniFix AI Support" <${process.env.EMAIL}>`,
      to: to,  
      subject: "Reset your Password",
      html: `<p>Your OTP for password reset is <b>${otp}</b>. This OTP is valid for 10 minutes.</p>`
    })
    console.log(`[MAIL] Password Reset OTP Email sent successfully to recipient, messageId: ${info.messageId}`)
  } catch (error) {
    console.error('[MAIL ERROR] Email sending failed (Password Reset OTP)')
    console.error('[MAIL ERROR] Error code:', error.code || 'UNKNOWN')
    console.error('[MAIL ERROR] Error message:', error.message)
    if (error.responseCode) console.error('[MAIL ERROR] Response code:', error.responseCode)
  }
}

// 1. Complaint Registered Email using existing transporter (process.env.EMAIL / process.env.PASS)
export const sendComplaintRegisteredMail = async (to, report, user) => {
  const hasTransporter = !!(process.env.EMAIL && process.env.PASS)
  console.log('[MAIL] Sending email: Complaint Registered')
  console.log(`[MAIL] Recipient configured: ${!!to}`)
  console.log(`[MAIL] Transporter configured: ${hasTransporter}`)

  try {
    if (!hasTransporter) {
      console.log('[MAIL ERROR] Nodemailer EMAIL/PASS not configured in environment. Skipping complaint registered email.')
      return
    }

    const mailOptions = {
      from: `"UniFix AI Support" <${process.env.EMAIL}>`,
      to: to,
      subject: `Campus Issue Report Registered - ${report._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #0284c7;">Hello ${user?.name || 'User'},</h2>
          <p>Your campus issue report has been successfully registered on UniFix AI.</p>
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
          <p>Thank you,<br /><strong>UniFix AI — Smart Campus Infrastructure Management</strong></p>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`[MAIL] Complaint Registration Email sent successfully, messageId: ${info.messageId}`)
  } catch (error) {
    console.error('[MAIL ERROR] Complaint Registered Email Error:', error.message)
    if (error.code) console.error('[MAIL ERROR] Error code:', error.code)
    if (error.responseCode) console.error('[MAIL ERROR] Response code:', error.responseCode)
  }
}

// 2. Complaint Resolved Email using existing transporter (process.env.EMAIL / process.env.PASS)
export const sendComplaintResolvedMail = async (to, report, user) => {
  const hasTransporter = !!(process.env.EMAIL && process.env.PASS)
  console.log('[MAIL] Sending email: Complaint Resolved')
  console.log(`[MAIL] Recipient configured: ${!!to}`)
  console.log(`[MAIL] Transporter configured: ${hasTransporter}`)

  try {
    if (!hasTransporter) {
      console.log('[MAIL ERROR] Nodemailer EMAIL/PASS not configured in environment. Skipping complaint resolved email.')
      return
    }

    const mailOptions = {
      from: `"UniFix AI Support" <${process.env.EMAIL}>`,
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
          <p>Thank you for helping keep our campus safe and functional!<br /><strong>UniFix AI — Smart Campus Infrastructure Management</strong></p>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`[MAIL] Complaint Resolution Email sent successfully, messageId: ${info.messageId}`)
  } catch (error) {
    console.error('[MAIL ERROR] Complaint Resolved Email Error:', error.message)
    if (error.code) console.error('[MAIL ERROR] Error code:', error.code)
    if (error.responseCode) console.error('[MAIL ERROR] Response code:', error.responseCode)
  }
}