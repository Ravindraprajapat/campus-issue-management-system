import { sendMessageReport } from './twillio.js'
import { sendComplaintRegisteredMail, sendComplaintResolvedMail } from './nodemailer.js'

// 1. Send Complaint Registered Notification (Twilio + Nodemailer using existing transporter)
export const sendComplaintRegisteredNotification = async ({ user, report }) => {
  try {
    // A. Twilio SMS / WhatsApp Notification (reusing existing implementation)
    if (user?.mobile) {
      try {
        await sendMessageReport(user.mobile)
      } catch (twilioErr) {
        console.error('Twilio Registration Notification Error:', twilioErr)
      }
    }

    // B. Nodemailer Email Notification (reusing existing process.env.EMAIL/PASS transporter)
    if (user?.email) {
      try {
        await sendComplaintRegisteredMail(user.email, report, user)
      } catch (emailErr) {
        console.error('Nodemailer Registration Email Error:', emailErr)
      }
    }
  } catch (error) {
    console.error('Registration Notification Error:', error)
  }
}

// 2. Send Complaint Resolved Notification (Twilio + Nodemailer using existing transporter)
export const sendComplaintResolvedNotification = async ({ user, report }) => {
  try {
    // A. Twilio SMS / WhatsApp Notification (reusing existing implementation)
    if (user?.mobile) {
      try {
        await sendMessageReport(user.mobile)
      } catch (twilioErr) {
        console.error('Twilio Resolution Notification Error:', twilioErr)
      }
    }

    // B. Nodemailer Email Notification (reusing existing process.env.EMAIL/PASS transporter)
    if (user?.email) {
      try {
        await sendComplaintResolvedMail(user.email, report, user)
      } catch (emailErr) {
        console.error('Nodemailer Resolution Email Error:', emailErr)
      }
    }
  } catch (error) {
    console.error('Resolution Notification Error:', error)
  }
}
