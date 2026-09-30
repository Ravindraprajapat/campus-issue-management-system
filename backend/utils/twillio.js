import twilio from 'twilio'
import dotenv from 'dotenv'

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

const client = twilio(accountSid, authToken)

export const sendMessageReport = async phone => {
  try {
    const message = await client.messages.create({
      body: `✅ *Civic Issue Registered Successfully!*

📍 Your report has been received by the system.

🛠 Our team will review the issue and take necessary action soon.

🙏 Thank you for helping improve the city.

_Stay responsible. Report civic problems._`,
      from: 'whatsapp:+14155238886',
      to: `whatsapp:+91${phone}`
    })

    console.log(message.sid)

  } catch (error) {
    console.error('Twilio Error:', error)
  }
}
